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
exports.GroupContributorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const advisory_lock_1 = require("../../infrastructure/db/advisory-lock");
const generate_display_id_1 = require("../../common/utils/generate-display-id");
let GroupContributorService = class GroupContributorService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async addSelfSlot(userId, groupId) {
        return this.prisma.$transaction(async (tx) => {
            var _a;
            await (0, advisory_lock_1.acquireAdvisoryXactLock)(tx, groupId);
            const group = await tx.group.findUnique({ where: { id: groupId } });
            if (!group)
                throw new common_1.NotFoundException('Group not found');
            if (group.frozenAt)
                throw new common_1.BadRequestException('Group is frozen — no mutations allowed');
            if (group.status !== 'NOT_STARTED')
                throw new common_1.BadRequestException('Can only add contributors while group is NOT_STARTED');
            const total = await tx.groupContributor.count({ where: { groupId } });
            if (total >= group.maxSlots)
                throw new common_1.BadRequestException('Group is already full');
            const userSlots = await tx.groupContributor.count({ where: { groupId, userId } });
            if (userSlots === 0) {
                throw new common_1.BadRequestException('You must already be a contributor to claim a second slot.');
            }
            if (userSlots >= 2)
                throw new common_1.BadRequestException('You already have the maximum slots in this group');
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const slotNumber = userSlots + 1;
            const contributor = await (0, generate_display_id_1.createContributorWithDisplayId)(tx, {
                groupId, userId, firstName: user.firstName, lastName: user.lastName, slotNumber,
            }, {
                joinMethod: 'admin_add',
                payoutOrder: total + 1,
            });
            if (group.adminId === userId) {
                await tx.groupContributor.update({ where: { id: contributor.id }, data: { termsAcceptedAt: new Date(), termsVersionAccepted: (_a = group.termsVersion) !== null && _a !== void 0 ? _a : 1 } });
            }
            return contributor;
        });
    }
    async removeContributor(adminId, groupId, contributorId) {
        return this.prisma.$transaction(async (tx) => {
            const contributor = await tx.groupContributor.findUnique({ where: { id: contributorId } });
            if (!contributor)
                throw new common_1.NotFoundException('Contributor not found');
            if (contributor.groupId !== groupId)
                throw new common_1.BadRequestException('Contributor does not belong to group');
            const group = await tx.group.findUnique({ where: { id: groupId } });
            if (!group)
                throw new common_1.NotFoundException('Group not found');
            if (group.status !== 'NOT_STARTED') {
                const payments = await tx.contributionPayment.count({ where: { groupContributorId: contributorId } });
                if (payments > 0)
                    throw new common_1.BadRequestException('Contributor has payments; removal not allowed');
            }
            if (group.adminId !== adminId)
                throw new common_1.BadRequestException('Only admin can remove contributors');
            await tx.auditLog.create({
                data: {
                    actorId: adminId,
                    action: 'remove_contributor',
                    entityType: 'GroupContributor',
                    entityId: contributorId,
                    metadata: { groupId },
                },
            });
            await tx.groupContributor.delete({ where: { id: contributorId } });
            return { success: true };
        });
    }
    async listContributors(groupId, opts = {}) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 20;
        const skip = (page - 1) * limit;
        const allowedSortFields = ['joinedAt', 'payoutOrder'];
        const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'joinedAt';
        const sortOrder = opts.sortOrder === 'desc' ? 'desc' : 'asc';
        const where = { groupId };
        if (opts.isActive !== undefined)
            where.isActive = opts.isActive;
        if (opts.search) {
            where.OR = [
                { displayId: { contains: opts.search, mode: 'insensitive' } },
                { user: { firstName: { contains: opts.search, mode: 'insensitive' } } },
                { user: { lastName: { contains: opts.search, mode: 'insensitive' } } },
                { user: { email: { contains: opts.search, mode: 'insensitive' } } },
            ];
        }
        const [contributors, total] = await Promise.all([
            this.prisma.groupContributor.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
                select: {
                    id: true,
                    displayId: true,
                    userId: true,
                    payoutOrder: true,
                    isActive: true,
                    termsAcceptedAt: true,
                    joinedAt: true,
                    user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
                    joinMethod: true,
                },
            }),
            this.prisma.groupContributor.count({ where }),
        ]);
        return {
            groupId,
            slots: group.maxSlots,
            items: contributors.map((c) => ({
                id: c.id,
                displayId: c.displayId,
                userId: c.userId,
                payoutOrder: c.payoutOrder,
                isActive: c.isActive,
                termsAcceptedAt: c.termsAcceptedAt,
                joinedAt: c.joinedAt,
                user: c.user,
                joinMethod: c.joinMethod,
            })),
            pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
        };
    }
    async swapPayoutOrder(adminId, groupId, aId, bId) {
        return this.prisma.$transaction(async (tx) => {
            const group = await tx.group.findUnique({ where: { id: groupId } });
            if (!group)
                throw new common_1.NotFoundException('Group not found');
            if (group.adminId !== adminId)
                throw new common_1.BadRequestException('Only admin can swap payout order');
            if (group.status !== 'NOT_STARTED')
                throw new common_1.BadRequestException('Swapping payout order only allowed before group start');
            const a = await tx.groupContributor.findUnique({ where: { id: aId } });
            const b = await tx.groupContributor.findUnique({ where: { id: bId } });
            if (!a || !b)
                throw new common_1.NotFoundException('Contributor(s) not found');
            if (a.groupId !== groupId || b.groupId !== groupId)
                throw new common_1.BadRequestException('Both contributors must belong to the group');
            if (typeof a.payoutOrder !== 'number' || typeof b.payoutOrder !== 'number') {
                throw new common_1.BadRequestException('Both contributors must have payoutOrder assigned to swap');
            }
            const temp = -Date.now();
            await tx.groupContributor.update({ where: { id: aId }, data: { payoutOrder: temp } });
            await tx.groupContributor.update({ where: { id: bId }, data: { payoutOrder: a.payoutOrder } });
            await tx.groupContributor.update({ where: { id: aId }, data: { payoutOrder: b.payoutOrder } });
            return { success: true };
        });
    }
    async acceptTerms(userId, groupId, contributorId) {
        var _a;
        const contributor = await this.prisma.groupContributor.findUnique({ where: { id: contributorId } });
        if (!contributor)
            throw new common_1.NotFoundException('Contributor not found');
        if (contributor.groupId !== groupId)
            throw new common_1.BadRequestException('Contributor does not belong to this group');
        if (contributor.userId !== userId)
            throw new common_1.BadRequestException('You can only accept terms for your own slot');
        if (contributor.termsAcceptedAt)
            return { success: true, termsAcceptedAt: contributor.termsAcceptedAt };
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        const updated = await this.prisma.groupContributor.update({
            where: { id: contributorId },
            data: { termsAcceptedAt: new Date(), termsVersionAccepted: (_a = group.termsVersion) !== null && _a !== void 0 ? _a : 1 },
        });
        return { success: true, termsAcceptedAt: updated.termsAcceptedAt };
    }
    async nudgeTerms(adminId, groupId) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.adminId !== adminId)
            throw new common_1.BadRequestException('Only the group admin can send term reminders');
        const pending = await this.prisma.groupContributor.findMany({
            where: { groupId, termsAcceptedAt: null },
            select: { id: true, userId: true },
        });
        if (pending.length === 0)
            return { sent: 0, message: 'All contributors have already accepted terms' };
        let sent = 0;
        for (const c of pending) {
            try {
                await this.notifications.sendNotification({
                    userId: c.userId,
                    type: 'TERMS_NUDGE',
                    title: 'Action Required: Accept Group Terms',
                    message: `Please accept the platform terms & conditions for group "${group.name}" so the group can start.`,
                    payload: { groupId, groupName: group.name, contributorId: c.id },
                });
                sent++;
            }
            catch (_) { }
        }
        return { sent, total: pending.length };
    }
};
exports.GroupContributorService = GroupContributorService;
exports.GroupContributorService = GroupContributorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], GroupContributorService);
//# sourceMappingURL=group-contributor.service.js.map