"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupLifecycleService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const payment_queue_service_1 = require("../../infrastructure/queue/payment-queue.service");
const queue_service_1 = require("../../infrastructure/queue/queue.service");
const notifications_service_1 = require("../notifications/notifications.service");
const advisory_lock_1 = require("../../infrastructure/db/advisory-lock");
let GroupLifecycleService = class GroupLifecycleService {
    constructor(prisma, paymentQueue, queue, notifications) {
        this.prisma = prisma;
        this.paymentQueue = paymentQueue;
        this.queue = queue;
        this.notifications = notifications;
    }
    addDays(date, days) {
        const d = new Date(date);
        d.setUTCDate(d.getUTCDate() + days);
        return d;
    }
    addMonths(date, months) {
        const d = new Date(date);
        d.setUTCMonth(d.getUTCMonth() + months);
        return d;
    }
    async startGroup(adminId, groupId, options) {
        const createdCycles = await this.prisma.$transaction(async (tx) => {
            var _a, _b;
            try {
                await (0, advisory_lock_1.acquireAdvisoryXactLock)(tx, groupId);
            }
            catch (err) {
            }
            const group = await tx.group.findUnique({ where: { id: groupId } });
            if (!group)
                throw new common_1.NotFoundException('Group not found');
            if (group.frozenAt)
                throw new common_1.BadRequestException('Group is frozen — no mutations allowed');
            if (group.adminId !== adminId)
                throw new common_1.BadRequestException('Only admin can start the group');
            if (group.status !== 'NOT_STARTED')
                throw new common_1.BadRequestException('Group must be NOT_STARTED to start');
            const contributors = await tx.groupContributor.findMany({ where: { groupId }, orderBy: { joinedAt: 'asc' } });
            if (contributors.length !== group.maxSlots)
                throw new common_1.BadRequestException('Group must be full to start');
            const pending = contributors.filter((c) => !c.termsAcceptedAt);
            if (pending.length > 0) {
                throw new common_1.BadRequestException(`All contributors must accept the platform terms before starting. ${pending.length} contributor(s) have not yet accepted.`);
            }
            const now = new Date();
            const anchor = (_a = options === null || options === void 0 ? void 0 : options.firstContributionDate) !== null && _a !== void 0 ? _a : now;
            const gracePeriodDays = (_b = group.gracePeriodDays) !== null && _b !== void 0 ? _b : 1;
            const cycles = [];
            for (let i = 0; i < contributors.length; i++) {
                let contributionDate;
                if (group.frequency === 'WEEKLY') {
                    contributionDate = this.addDays(anchor, i * 7);
                }
                else {
                    contributionDate = this.addMonths(anchor, i);
                }
                const payoutDate = this.addDays(contributionDate, gracePeriodDays + 1);
                cycles.push({ groupId, cycleNumber: i + 1, contributionDate, payoutDate, status: 'PENDING' });
            }
            const created = [];
            for (const c of cycles) {
                const row = await tx.contributionCycle.create({ data: c });
                created.push(row);
            }
            await tx.group.update({ where: { id: groupId }, data: { status: 'STARTED', startDate: now, firstContributionDate: anchor } });
            return created;
        });
        for (const c of createdCycles) {
            try {
                await this.paymentQueue.scheduleAutoDebit({ id: c.id, contributionDate: c.contributionDate });
            }
            catch (err) {
                console.warn('Failed to schedule auto-debit for cycle', c.id, (err === null || err === void 0 ? void 0 : err.message) || err);
            }
        }
        try {
            const adminNote = this.notifications.sendNotification({ userId: createdCycles[0] ? (await this.prisma.group.findUnique({ where: { id: createdCycles[0].groupId }, select: { adminId: true } })).adminId : null, type: 'GROUP_STARTED', title: 'Group started', message: 'Your group has started', payload: { groupId } });
            const contributors = await this.prisma.groupContributor.findMany({ where: { groupId } });
            for (const contrib of contributors) {
                try {
                    await this.notifications.sendNotification({ userId: contrib.userId, type: 'GROUP_STARTED', title: 'Group started', message: `Group you joined has started`, payload: { groupId, cycleIds: createdCycles.map((c) => c.id) } });
                }
                catch (err) {
                }
            }
            await adminNote;
        }
        catch (err) {
        }
        return { success: true, cycles: createdCycles.map((c) => c.id) };
    }
    async forcePayoutCycle(adminId, groupId, cycleId) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.adminId !== adminId)
            throw new common_1.BadRequestException('Only the group admin can trigger a manual payout');
        if (group.frozenAt)
            throw new common_1.BadRequestException('Group is frozen — no mutations allowed');
        const cycle = await this.prisma.contributionCycle.findUnique({ where: { id: cycleId }, include: { payments: true } });
        if (!cycle)
            throw new common_1.NotFoundException('Cycle not found');
        if (cycle.groupId !== groupId)
            throw new common_1.BadRequestException('Cycle does not belong to this group');
        if (cycle.status === 'COMPLETED')
            throw new common_1.BadRequestException('Cycle is already completed');
        if (cycle.status !== 'COLLECTING')
            throw new common_1.BadRequestException('Cycle must be in COLLECTING status to force payout');
        await this.prisma.$transaction(async (tx) => {
            const nonPaid = cycle.payments.filter((p) => p.status === 'UNPAID' || p.status === 'FAILED');
            if (nonPaid.length > 0) {
                await tx.contributionPayment.updateMany({
                    where: { id: { in: nonPaid.map((p) => p.id) }, status: { in: ['UNPAID', 'FAILED'] } },
                    data: { status: 'DEFAULTED' },
                });
            }
            await tx.contributionCycle.update({ where: { id: cycleId }, data: { status: 'COMPLETED', completedAt: new Date() } });
            await tx.auditLog.create({
                data: { actorId: adminId, action: 'admin_force_payout', entityType: 'ContributionCycle', entityId: cycleId, metadata: { defaultedCount: nonPaid.length, groupId } },
            });
        });
        await this.queue.addPayoutJob('process-payout', { cycleId }, { jobId: `force_payout_${cycleId}_${Date.now()}`, removeOnComplete: true });
        return { ok: true, cycleId };
    }
    async rescheduleCycle(adminId, groupId, cycleId, newDate, reason) {
        if (newDate <= new Date())
            throw new common_1.BadRequestException('New contribution date must be in the future');
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.adminId !== adminId)
            throw new common_1.BadRequestException('Only the group admin can reschedule cycles');
        if (group.status !== 'STARTED')
            throw new common_1.BadRequestException('Can only reschedule cycles on a started group');
        if (group.frozenAt)
            throw new common_1.BadRequestException('Group is frozen — no mutations allowed');
        const cycle = await this.prisma.contributionCycle.findUnique({ where: { id: cycleId } });
        if (!cycle)
            throw new common_1.NotFoundException('Cycle not found');
        if (cycle.groupId !== groupId)
            throw new common_1.BadRequestException('Cycle does not belong to this group');
        if (cycle.status !== 'PENDING')
            throw new common_1.BadRequestException('Only PENDING (not yet collecting) cycles can be rescheduled directly — raise a reschedule-request for cycles that are already collecting');
        if (newDate <= cycle.contributionDate)
            throw new common_1.BadRequestException('New contribution date must be later than the current scheduled date');
        const maxDeltaMs = group.frequency === 'WEEKLY' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
        const maxLabel = group.frequency === 'WEEKLY' ? '7 days' : '30 days';
        const deltaMs = newDate.getTime() - cycle.contributionDate.getTime();
        if (deltaMs > maxDeltaMs)
            throw new common_1.BadRequestException(`Cannot push the contribution date by more than ${maxLabel} (one ${group.frequency === 'WEEKLY' ? 'week' : 'month'} interval)`);
        const pendingCycles = await this.prisma.contributionCycle.findMany({
            where: { groupId, status: 'PENDING', cycleNumber: { gte: cycle.cycleNumber } },
            orderBy: { cycleNumber: 'asc' },
        });
        for (const c of pendingCycles) {
            const newCycleDate = new Date(c.contributionDate.getTime() + deltaMs);
            await this.prisma.contributionCycle.update({ where: { id: c.id }, data: { contributionDate: newCycleDate } });
            await this.queue.cancelScheduledPayment(c.id);
            await this.paymentQueue.scheduleAutoDebit({ id: c.id, contributionDate: newCycleDate });
        }
        const cycle1Shifted = pendingCycles.find((c) => c.cycleNumber === 1);
        if (cycle1Shifted) {
            await this.prisma.group.update({
                where: { id: groupId },
                data: { firstContributionDate: new Date(cycle1Shifted.contributionDate.getTime() + deltaMs) },
            });
        }
        await this.prisma.auditLog.create({
            data: {
                actorId: adminId,
                action: 'reschedule_cycle',
                entityType: 'ContributionCycle',
                entityId: cycleId,
                metadata: { groupId, reason, previousDate: cycle.contributionDate.toISOString(), newDate: newDate.toISOString(), cascadedCycleIds: pendingCycles.map((c) => c.id) },
            },
        });
        const contributors = await this.prisma.groupContributor.findMany({ where: { groupId } });
        for (const contrib of contributors) {
            try {
                await this.notifications.sendNotification({
                    userId: contrib.userId,
                    type: 'CYCLE_RESCHEDULE_APPROVED',
                    title: 'Contribution date updated',
                    message: `Your contribution date for cycle ${cycle.cycleNumber} has been moved from ${cycle.contributionDate.toDateString()} to ${newDate.toDateString()}. Reason: ${reason}`,
                    payload: { groupId, cycleId, cycleNumber: cycle.cycleNumber, previousDate: cycle.contributionDate.toISOString(), newDate: newDate.toISOString(), reason },
                });
            }
            catch (_) { }
        }
        const updatedCycles = await this.prisma.contributionCycle.findMany({
            where: { id: { in: pendingCycles.map((c) => c.id) } },
            orderBy: { cycleNumber: 'asc' },
        });
        return { ok: true, rescheduledCount: pendingCycles.length, cycles: updatedCycles };
    }
    async requestCycleReschedule(adminId, groupId, cycleId, requestedDate, reason) {
        if (requestedDate <= new Date())
            throw new common_1.BadRequestException('Requested date must be in the future');
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.adminId !== adminId)
            throw new common_1.BadRequestException('Only the group admin can request a cycle reschedule');
        if (group.status !== 'STARTED')
            throw new common_1.BadRequestException('Can only request reschedule on a started group');
        if (group.frozenAt)
            throw new common_1.BadRequestException('Group is frozen — no mutations allowed');
        const cycle = await this.prisma.contributionCycle.findUnique({ where: { id: cycleId } });
        if (!cycle)
            throw new common_1.NotFoundException('Cycle not found');
        if (cycle.groupId !== groupId)
            throw new common_1.BadRequestException('Cycle does not belong to this group');
        if (cycle.status === 'COMPLETED')
            throw new common_1.BadRequestException('Cannot reschedule a completed cycle');
        if (cycle.status === 'PENDING')
            throw new common_1.BadRequestException('Cycle has not started collecting yet — use PATCH /groups/:id/cycles/:cycleId/reschedule to reschedule directly');
        if (requestedDate <= cycle.contributionDate)
            throw new common_1.BadRequestException('Requested date must be later than the current scheduled date');
        const existing = await this.prisma.ticket.findFirst({
            where: { type: 'CYCLE_RESCHEDULE', cycleId, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        });
        if (existing)
            throw new common_1.BadRequestException('A reschedule request for this cycle is already pending super admin review');
        const ticket = await this.prisma.ticket.create({
            data: {
                type: 'CYCLE_RESCHEDULE',
                groupId,
                userId: adminId,
                cycleId,
                requestedDate,
                reason,
                status: 'PENDING',
            },
        });
        await this.prisma.auditLog.create({
            data: {
                actorId: adminId,
                action: 'request_cycle_reschedule',
                entityType: 'ContributionCycle',
                entityId: cycleId,
                metadata: { groupId, ticketId: ticket.id, currentDate: cycle.contributionDate.toISOString(), requestedDate: requestedDate.toISOString(), reason },
            },
        });
        const superAdmins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' } });
        for (const sa of superAdmins) {
            try {
                await this.notifications.sendNotification({
                    userId: sa.id,
                    type: 'CYCLE_RESCHEDULE_REQUESTED',
                    title: 'Cycle reschedule request',
                    message: `Group admin has requested to reschedule cycle ${cycle.cycleNumber} in "${group.name}" from ${cycle.contributionDate.toDateString()} to ${requestedDate.toDateString()}. Reason: ${reason}`,
                    payload: { ticketId: ticket.id, groupId, cycleId, cycleNumber: cycle.cycleNumber, currentDate: cycle.contributionDate.toISOString(), requestedDate: requestedDate.toISOString(), reason },
                });
            }
            catch (_) { }
        }
        return { ok: true, ticketId: ticket.id, message: 'Reschedule request submitted for super admin approval' };
    }
    async approveCycleReschedule(superAdminId, ticketId) {
        const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId }, include: { group: true } });
        if (!ticket)
            throw new common_1.NotFoundException('Ticket not found');
        if (ticket.type !== 'CYCLE_RESCHEDULE')
            throw new common_1.BadRequestException('This ticket is not a cycle reschedule request');
        if (ticket.status !== 'PENDING' && ticket.status !== 'UNDER_REVIEW')
            throw new common_1.BadRequestException('Ticket is no longer pending approval');
        const cycleId = ticket.cycleId;
        const requestedDate = new Date(ticket.requestedDate);
        if (!cycleId || !ticket.requestedDate)
            throw new common_1.BadRequestException('Ticket is missing cycle or date information');
        const cycle = await this.prisma.contributionCycle.findUnique({ where: { id: cycleId } });
        if (!cycle)
            throw new common_1.NotFoundException('Cycle not found');
        if (cycle.groupId !== ticket.groupId)
            throw new common_1.BadRequestException('Cycle does not belong to this group');
        if (cycle.status !== 'PENDING')
            throw new common_1.BadRequestException('Cycle is no longer PENDING — cannot be rescheduled');
        if (requestedDate <= new Date())
            throw new common_1.BadRequestException('The requested date is now in the past — cannot approve this reschedule');
        const deltaMs = requestedDate.getTime() - cycle.contributionDate.getTime();
        const pendingCycles = await this.prisma.contributionCycle.findMany({
            where: { groupId: ticket.groupId, status: 'PENDING', cycleNumber: { gte: cycle.cycleNumber } },
            orderBy: { cycleNumber: 'asc' },
        });
        for (const c of pendingCycles) {
            const newCycleDate = new Date(c.contributionDate.getTime() + deltaMs);
            await this.prisma.contributionCycle.update({ where: { id: c.id }, data: { contributionDate: newCycleDate } });
            await this.queue.cancelScheduledPayment(c.id);
            await this.paymentQueue.scheduleAutoDebit({ id: c.id, contributionDate: newCycleDate });
        }
        const cycle1Shifted = pendingCycles.find((c) => c.cycleNumber === 1);
        if (cycle1Shifted) {
            await this.prisma.group.update({
                where: { id: ticket.groupId },
                data: { firstContributionDate: new Date(cycle1Shifted.contributionDate.getTime() + deltaMs) },
            });
        }
        await this.prisma.ticket.update({
            where: { id: ticketId },
            data: { status: 'APPROVED', adminNotes: `Approved by super admin. ${pendingCycles.length} cycle(s) rescheduled.`, resolvedAt: new Date() },
        });
        await this.prisma.auditLog.create({
            data: {
                actorId: superAdminId,
                action: 'approve_cycle_reschedule',
                entityType: 'ContributionCycle',
                entityId: cycleId,
                metadata: { ticketId, groupId: ticket.groupId, previousDate: cycle.contributionDate.toISOString(), newDate: requestedDate.toISOString(), cascadedCycleIds: pendingCycles.map((c) => c.id), reason: ticket.reason },
            },
        });
        const contributors = await this.prisma.groupContributor.findMany({ where: { groupId: ticket.groupId } });
        for (const contrib of contributors) {
            try {
                await this.notifications.sendNotification({
                    userId: contrib.userId,
                    type: 'CYCLE_RESCHEDULE_APPROVED',
                    title: 'Contribution date updated',
                    message: `Your contribution date for cycle ${cycle.cycleNumber} has been moved from ${cycle.contributionDate.toDateString()} to ${requestedDate.toDateString()}.`,
                    payload: { groupId: ticket.groupId, cycleId, cycleNumber: cycle.cycleNumber, previousDate: cycle.contributionDate.toISOString(), newDate: requestedDate.toISOString(), reason: ticket.reason },
                });
            }
            catch (_) { }
        }
        try {
            await this.notifications.sendNotification({
                userId: ticket.userId,
                type: 'CYCLE_RESCHEDULE_APPROVED',
                title: 'Reschedule request approved',
                message: `Your request to reschedule cycle ${cycle.cycleNumber} has been approved. New date: ${requestedDate.toDateString()}.`,
                payload: { ticketId, groupId: ticket.groupId, cycleId, newDate: requestedDate.toISOString() },
            });
        }
        catch (_) { }
        const updatedCycles = await this.prisma.contributionCycle.findMany({
            where: { id: { in: pendingCycles.map((c) => c.id) } },
            orderBy: { cycleNumber: 'asc' },
        });
        return { ok: true, rescheduledCount: pendingCycles.length, cycles: updatedCycles };
    }
    async rejectCycleReschedule(superAdminId, ticketId, notes) {
        const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket)
            throw new common_1.NotFoundException('Ticket not found');
        if (ticket.type !== 'CYCLE_RESCHEDULE')
            throw new common_1.BadRequestException('This ticket is not a cycle reschedule request');
        if (ticket.status !== 'PENDING' && ticket.status !== 'UNDER_REVIEW')
            throw new common_1.BadRequestException('Ticket is no longer pending approval');
        await this.prisma.ticket.update({
            where: { id: ticketId },
            data: { status: 'REJECTED', adminNotes: notes !== null && notes !== void 0 ? notes : null, resolvedAt: new Date() },
        });
        await this.prisma.auditLog.create({
            data: {
                actorId: superAdminId,
                action: 'reject_cycle_reschedule',
                entityType: 'Ticket',
                entityId: ticketId,
                metadata: { groupId: ticket.groupId, cycleId: ticket.cycleId, notes: notes !== null && notes !== void 0 ? notes : null },
            },
        });
        try {
            await this.notifications.sendNotification({
                userId: ticket.userId,
                type: 'CYCLE_RESCHEDULE_REJECTED',
                title: 'Reschedule request rejected',
                message: `Your request to reschedule a contribution cycle has been rejected.${notes ? ` Reason: ${notes}` : ''}`,
                payload: { ticketId, groupId: ticket.groupId, cycleId: ticket.cycleId, notes: notes !== null && notes !== void 0 ? notes : null },
            });
        }
        catch (_) { }
        return { ok: true, ticketId };
    }
};
exports.GroupLifecycleService = GroupLifecycleService;
exports.GroupLifecycleService = GroupLifecycleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, payment_queue_service_1.PaymentQueueService, queue_service_1.QueueService, notifications_service_1.NotificationsService])
], GroupLifecycleService);
//# sourceMappingURL=group-lifecycle.service.js.map