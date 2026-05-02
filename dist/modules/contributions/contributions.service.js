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
var ContributionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContributionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const queue_service_1 = require("../../infrastructure/queue/queue.service");
const advisory_lock_1 = require("../../infrastructure/db/advisory-lock");
const transactions_service_1 = require("../transactions/transactions.service");
const audit_service_1 = require("../../common/audit/audit.service");
const redis_service_1 = require("../../infrastructure/redis/redis.service");
let ContributionsService = ContributionsService_1 = class ContributionsService {
    constructor(prisma, queue, transactions, audit, redis) {
        this.prisma = prisma;
        this.queue = queue;
        this.transactions = transactions;
        this.audit = audit;
        this.redis = redis;
        this.logger = new common_1.Logger(ContributionsService_1.name);
    }
    async createCycle(params) {
        const { groupId, cycleNumber, contributionDate, payoutDate } = params;
        if (payoutDate <= contributionDate) {
            throw new common_1.BadRequestException('payoutDate must be after contributionDate');
        }
        const created = await this.prisma.$transaction(async (tx) => {
            var _a;
            try {
                await (0, advisory_lock_1.acquireAdvisoryXactLock)(tx, groupId);
            }
            catch (err) {
            }
            const existing = await tx.contributionCycle.findFirst({
                where: { groupId, cycleNumber },
            });
            if (existing)
                return existing;
            const group = await tx.group.findUnique({ where: { id: groupId } });
            if (!group)
                throw new common_1.BadRequestException('Group not found');
            const maxCycle = await tx.contributionCycle.findFirst({
                where: { groupId },
                orderBy: { cycleNumber: 'desc' },
                select: { cycleNumber: true },
            });
            const expectedNext = ((_a = maxCycle === null || maxCycle === void 0 ? void 0 : maxCycle.cycleNumber) !== null && _a !== void 0 ? _a : 0) + 1;
            if (cycleNumber !== expectedNext) {
                throw new common_1.BadRequestException(`cycleNumber must be ${expectedNext} (sequential)`);
            }
            const cycle = await tx.contributionCycle.create({
                data: {
                    groupId,
                    cycleNumber,
                    contributionDate,
                    payoutDate,
                    status: 'PENDING',
                },
            });
            const contributors = await tx.groupContributor.findMany({ where: { groupId }, orderBy: [{ payoutOrder: 'asc' }, { joinedAt: 'asc' }] });
            const paymentsData = contributors.map((m) => ({
                cycleId: cycle.id,
                groupContributorId: m.id,
                amount: group.contributionAmount,
                status: 'UNPAID',
            }));
            if (paymentsData.length > 0) {
                await tx.contributionPayment.createMany({ data: paymentsData });
            }
            await tx.auditLog.create({
                data: {
                    actorId: null,
                    action: 'create_contribution_cycle',
                    entityType: 'ContributionCycle',
                    entityId: cycle.id,
                    metadata: { groupId, cycleNumber, payments: paymentsData.length },
                },
            });
            return cycle;
        });
        this.logger.log(`Created contribution cycle ${created.id} for group ${groupId}`);
        try {
            const leadSeconds = parseInt(process.env.REMINDER_LEAD_SECONDS || '86400', 10);
            const leadMs = Number.isNaN(leadSeconds) ? 86400 * 1000 : leadSeconds * 1000;
            const contributorsPost = await this.prisma.groupContributor.findMany({ where: { groupId } });
            const contributionDate = typeof created.contributionDate === 'string' ? new Date(created.contributionDate) : created.contributionDate;
            let delay = contributionDate.getTime() - Date.now() - leadMs;
            if (delay < 0)
                delay = 0;
            for (const m of contributorsPost) {
                try {
                    await this.queue.addNotificationJob('send-notification', { userId: m.userId, type: 'PAYMENT_REMINDER', payload: { cycleId: created.id, groupId } }, { jobId: `reminder:${created.id}:${m.id}`, delay, attempts: 1, removeOnComplete: true });
                }
                catch (err) {
                    this.logger.warn('Failed to enqueue payment reminder', (err === null || err === void 0 ? void 0 : err.message) || err);
                }
            }
        }
        catch (err) {
            this.logger.warn('Failed to schedule payment reminders', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        return created;
    }
    async checkCycleCompletion(cycleId) {
        const res = await this.prisma.$transaction(async (tx) => {
            try {
                await (0, advisory_lock_1.acquireAdvisoryXactLock)(tx, cycleId);
            }
            catch (err) {
            }
            const cycle = await tx.contributionCycle.findUnique({ where: { id: cycleId }, include: { payments: true } });
            if (!cycle)
                throw new common_1.NotFoundException('Cycle not found');
            const allPaid = cycle.payments.length > 0 && cycle.payments.every((p) => p.status === 'PAID');
            if (allPaid && cycle.status !== 'COMPLETED') {
                await tx.contributionCycle.update({ where: { id: cycleId }, data: { status: 'COMPLETED' } });
                await tx.auditLog.create({
                    data: {
                        actorId: null,
                        action: 'complete_contribution_cycle',
                        entityType: 'ContributionCycle',
                        entityId: cycleId,
                        metadata: { groupId: cycle.groupId },
                    },
                });
                return { completed: true };
            }
            return { completed: false };
        });
        if (res.completed) {
            try {
                await this.queue.addPayoutJob('payout_cycle', { cycleId });
            }
            catch (err) {
                this.logger.warn('Failed to enqueue payout job', (err === null || err === void 0 ? void 0 : err.message) || err);
            }
            this.logger.log(`Cycle ${cycleId} completed and payout enqueued`);
        }
        return res;
    }
    async getCurrentCycle(groupId) {
        const cycle = await this.prisma.contributionCycle.findFirst({
            where: { groupId, status: { not: 'COMPLETED' } },
            orderBy: { cycleNumber: 'asc' },
            include: { payments: { include: { groupContributor: { include: { user: true } } } } },
        });
        return cycle || null;
    }
    async getDefaulters(cycleId, opts) {
        const page = (opts === null || opts === void 0 ? void 0 : opts.page) && opts.page > 0 ? opts.page : 1;
        const limit = (opts === null || opts === void 0 ? void 0 : opts.limit) && opts.limit > 0 ? Math.min(500, opts.limit) : 100;
        const skip = (page - 1) * limit;
        const allowedSortFields = ['createdAt', 'status'];
        const sortBy = (opts === null || opts === void 0 ? void 0 : opts.sortBy) && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
        const sortOrder = (opts === null || opts === void 0 ? void 0 : opts.sortOrder) === 'desc' ? 'desc' : 'asc';
        const where = { cycleId, status: { not: 'PAID' } };
        const [payments, total] = await Promise.all([
            this.prisma.contributionPayment.findMany({
                where,
                include: { groupContributor: { include: { user: true } } },
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.prisma.contributionPayment.count({ where }),
        ]);
        const data = payments.map((p) => ({ paymentId: p.id, contributor: p.groupContributor }));
        const pages = Math.max(1, Math.ceil(total / limit));
        return { items: data, pagination: { total, page, limit, pages } };
    }
    async getPendingPaymentsForCycle(cycleId) {
        return this.prisma.contributionPayment.findMany({ where: { cycleId, status: 'UNPAID' }, include: { groupContributor: { include: { user: true } } } });
    }
    async getGroupContributionStatus(groupId) {
        const current = await this.getCurrentCycle(groupId);
        if (!current)
            return { current: null, paid: [], unpaid: [], defaulters: [] };
        const paid = current.payments.filter((p) => p.status === 'PAID').map((p) => p.groupContributor);
        const unpaid = current.payments.filter((p) => p.status !== 'PAID').map((p) => p.groupContributor);
        const defaulters = current.payments.filter((p) => p.status !== 'PAID' && current.payoutDate < new Date()).map((p) => p.groupContributor);
        return { current, paid, unpaid, defaulters };
    }
    async getGroupSummary(groupId) {
        const key = `group:summary:${groupId}`;
        try {
            const cached = await this.redis.get(key);
            if (cached)
                return cached;
        }
        catch (err) {
        }
        const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { id: true, name: true, contributionAmount: true, frequency: true, status: true, createdAt: true } });
        if (!group)
            throw new common_1.BadRequestException('Group not found');
        const contributorCount = await this.prisma.groupContributor.count({ where: { groupId } });
        const summary = { ...group, contributorCount };
        try {
            await this.redis.set(key, summary, 60);
        }
        catch (err) { }
        return summary;
    }
    async recordContributionPayment(params) {
        var _a, _b, _c, _d;
        const { cycleId, groupContributorId, reference, amount, payerWalletId } = params;
        const payment = await this.prisma.contributionPayment.findFirst({
            where: { cycleId, groupContributorId },
            include: { cycle: { include: { group: true } }, groupContributor: true },
        });
        if (!payment)
            throw new common_1.BadRequestException('Contribution payment record not found');
        if (payment.status === 'PAID') {
            this.logger.debug(`Payment ${payment.id} already PAID`);
            return { payment, transaction: null };
        }
        if (payment.cycle && payment.cycle.status === 'COMPLETED') {
            throw new common_1.BadRequestException('Cannot pay for a completed cycle');
        }
        const expected = (_b = (_a = payment.cycle) === null || _a === void 0 ? void 0 : _a.group) === null || _b === void 0 ? void 0 : _b.contributionAmount;
        if (expected != null) {
            const expectedStr = expected.toString();
            const providedStr = typeof amount === 'number' ? amount.toString() : amount;
            if (providedStr !== expectedStr) {
                throw new common_1.BadRequestException('Payment amount does not match group contribution amount');
            }
        }
        const result = await this.prisma.$transaction(async (tx) => {
            var _a, _b, _c, _d;
            await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
            const payerWallet = await tx.wallet.findUnique({ where: { id: payerWalletId }, select: { paystackProvisionStatus: true } });
            if (!payerWallet)
                throw new common_1.BadRequestException('Payer wallet not found');
            if (payerWallet.paystackProvisionStatus !== 'PROVISIONED')
                throw new common_1.BadRequestException('Payer wallet not provisioned with virtual account');
            const existingTx = await tx.transaction.findFirst({ where: { reference } });
            let txRecord = existingTx;
            if (!existingTx) {
                const groupId = (_b = (_a = payment.cycle) === null || _a === void 0 ? void 0 : _a.group) === null || _b === void 0 ? void 0 : _b.id;
                if (!groupId)
                    throw new common_1.BadRequestException('Group not found for contribution cycle');
                let groupWallet = await tx.wallet.findUnique({ where: { groupId } });
                if (!groupWallet) {
                    groupWallet = await tx.wallet.create({ _internal: true, data: { groupId } });
                }
                const de = await this.transactions.createDoubleEntry({
                    fromWalletId: payerWalletId,
                    toWalletId: groupWallet.id,
                    amount: typeof amount === 'number' ? amount.toString() : amount,
                    reference,
                    status: 'SUCCESS',
                    metadata: { cycleId, groupContributorId },
                }, tx);
                txRecord = de;
            }
            const updatedPayment = await tx.contributionPayment.update({
                where: { id: payment.id },
                data: { status: 'PAID', paidAt: new Date() },
            });
            await tx.auditLog.create({
                data: {
                    actorId: null,
                    action: 'record_contribution_payment',
                    entityType: 'ContributionPayment',
                    entityId: updatedPayment.id,
                    metadata: { transaction: txRecord, reference, groupId: (_d = (_c = payment.cycle) === null || _c === void 0 ? void 0 : _c.group) === null || _d === void 0 ? void 0 : _d.id, cycleId: payment.cycleId },
                },
            });
            return { payment: updatedPayment, transaction: txRecord };
        });
        try {
            const userId = ((_c = payment === null || payment === void 0 ? void 0 : payment.groupContributor) === null || _c === void 0 ? void 0 : _c.userId) || null;
            if (userId) {
                await this.queue.addNotificationJob('send-notification', { userId, type: 'PAYMENT_SUCCESS', payload: { paymentId: result.payment.id, cycleId: result.payment.cycleId } });
            }
        }
        catch (err) {
            this.logger.warn('Failed to enqueue notification', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        this.logger.log(`Recorded payment ${result.payment.id} tx=${(_d = result.transaction) === null || _d === void 0 ? void 0 : _d.id}`);
        try {
            await this.checkCycleCompletion(result.payment.cycleId);
        }
        catch (err) {
            this.logger.warn('checkCycleCompletion failed', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        return result;
    }
    async completeCycle(cycleId) {
        const cycle = await this.prisma.contributionCycle.findUnique({ where: { id: cycleId }, include: { payments: true, group: true } });
        if (!cycle)
            throw new common_1.BadRequestException('Cycle not found');
        if (cycle.status === 'COMPLETED')
            return cycle;
        await this.prisma.$transaction(async (tx) => {
            await tx.contributionCycle.update({ where: { id: cycleId }, data: { status: 'COMPLETED' } });
            await tx.auditLog.create({
                data: {
                    actorId: null,
                    action: 'complete_contribution_cycle',
                    entityType: 'ContributionCycle',
                    entityId: cycleId,
                    metadata: { groupId: cycle.groupId },
                },
            });
        });
        await this.queue.addPayoutJob('payout_cycle', { cycleId });
        this.logger.log(`Cycle ${cycleId} completed and payout enqueued`);
        return this.prisma.contributionCycle.findUnique({ where: { id: cycleId } });
    }
    async adminMarkPaymentPaid(paymentId, adminId, reason) {
        var _a;
        const payment = await this.prisma.contributionPayment.findUnique({
            where: { id: paymentId },
            include: { cycle: { include: { group: true } } },
        });
        if (!payment)
            throw new common_1.BadRequestException('Payment not found');
        if (payment.status === 'PAID')
            return { ok: true, message: 'Already paid' };
        if (((_a = payment.cycle) === null || _a === void 0 ? void 0 : _a.status) === 'COMPLETED')
            throw new common_1.BadRequestException('Cycle already completed');
        await this.prisma.$transaction(async (tx) => {
            var _a, _b;
            await tx.contributionPayment.update({
                where: { id: paymentId },
                data: { status: 'PAID', paidAt: new Date() },
            });
            await tx.auditLog.create({
                data: {
                    actorId: adminId,
                    action: 'admin_mark_payment_paid',
                    entityType: 'ContributionPayment',
                    entityId: paymentId,
                    metadata: { reason: reason || 'Admin override', cycleId: payment.cycleId, groupId: (_b = (_a = payment.cycle) === null || _a === void 0 ? void 0 : _a.group) === null || _b === void 0 ? void 0 : _b.id },
                },
            });
        });
        try {
            await this.checkCycleCompletion(payment.cycleId);
        }
        catch (err) {
            this.logger.warn('checkCycleCompletion failed after admin override', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        return { ok: true };
    }
    async enqueueRetryFailed(cycleId) {
        const cycle = await this.prisma.contributionCycle.findUnique({ where: { id: cycleId } });
        if (!cycle)
            throw new common_1.BadRequestException('Cycle not found');
        if (cycle.status === 'COMPLETED')
            throw new common_1.BadRequestException('Cycle already completed');
        const failedCount = await this.prisma.contributionPayment.count({ where: { cycleId, status: 'FAILED' } });
        if (failedCount === 0)
            throw new common_1.BadRequestException('No failed payments to retry');
        await this.queue.addPaymentJob('retry-failed-payments', { cycleId }, { jobId: `retry_failed_${cycleId}_${Date.now()}` });
        return { ok: true, failedCount };
    }
    async waiveLateFee(paymentId, adminId, reason) {
        var _a, _b;
        const payment = await this.prisma.contributionPayment.findUnique({
            where: { id: paymentId },
            include: { cycle: { include: { group: true } }, groupContributor: true },
        });
        if (!payment)
            throw new common_1.BadRequestException('Payment not found');
        const cycleId = payment.cycleId;
        const userId = payment.groupContributor.userId;
        const lateFee = Number(((_b = (_a = payment.cycle) === null || _a === void 0 ? void 0 : _a.group) === null || _b === void 0 ? void 0 : _b.lateFee) || 0);
        if (!lateFee || lateFee <= 0)
            throw new common_1.BadRequestException('No late fee configured for this group');
        const originalRef = `late-fee:${cycleId}:${paymentId}`;
        const originalTx = await this.prisma.transaction.findFirst({ where: { reference: originalRef } });
        if (!originalTx)
            throw new common_1.BadRequestException('No late fee found for this payment');
        const reverseRef = `late-fee-waive:${cycleId}:${paymentId}`;
        const existingReverse = await this.prisma.transaction.findFirst({ where: { reference: reverseRef } });
        if (existingReverse)
            return { ok: true, message: 'Late fee already waived' };
        const userWallet = await this.prisma.wallet.findUnique({ where: { userId } });
        if (!userWallet)
            throw new common_1.BadRequestException('User wallet not found');
        const groupWallet = await this.prisma.wallet.findUnique({ where: { groupId: payment.cycle.groupId } });
        if (!groupWallet)
            throw new common_1.BadRequestException('Group wallet not found');
        await this.prisma.$transaction(async (tx) => {
            var _a;
            await this.transactions.createDoubleEntry({
                fromWalletId: groupWallet.id,
                toWalletId: userWallet.id,
                amount: lateFee.toString(),
                reference: reverseRef,
                status: 'SUCCESS',
                metadata: { cycleId, paymentId, reason: reason || 'Admin waive' },
            }, tx);
            await tx.auditLog.create({
                data: {
                    actorId: adminId,
                    action: 'waive_late_fee',
                    entityType: 'ContributionPayment',
                    entityId: paymentId,
                    metadata: { lateFee, cycleId, reason: reason || 'Admin waive', groupId: (_a = payment.cycle) === null || _a === void 0 ? void 0 : _a.groupId },
                },
            });
        });
        return { ok: true };
    }
};
exports.ContributionsService = ContributionsService;
exports.ContributionsService = ContributionsService = ContributionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        queue_service_1.QueueService,
        transactions_service_1.TransactionsService,
        audit_service_1.AuditService,
        redis_service_1.RedisService])
], ContributionsService);
//# sourceMappingURL=contributions.service.js.map