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
var GroupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupService = void 0;
const common_1 = require("@nestjs/common");
const enums_1 = require("../../common/enums");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const crypto_1 = require("crypto");
const notifications_service_1 = require("../notifications/notifications.service");
const transactions_service_1 = require("../transactions/transactions.service");
let GroupService = GroupService_1 = class GroupService {
    constructor(prisma, notifications, transactions) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.transactions = transactions;
    }
    async createGroup(actorId, dto, ipAddress) {
        const activeCount = await this.prisma.group.count({ where: { adminId: actorId, status: { in: [enums_1.GroupStatus.NOT_STARTED, enums_1.GroupStatus.STARTED] } } });
        if (activeCount >= 2)
            throw new common_1.BadRequestException('User already has maximum number of active groups');
        if (dto.maxSlots < 2)
            throw new common_1.BadRequestException('Group must have at least 2 contributors');
        if (!dto.adminIndemnityAccepted) {
            throw new common_1.BadRequestException('You must accept the platform indemnity to create a group.');
        }
        return this.prisma.$transaction(async (tx) => {
            var _a, _b, _c;
            const contributionAmount = dto.contributionAmount;
            const frequency = dto.frequency;
            const g = await tx.group.create({
                data: {
                    name: dto.name,
                    description: dto.description,
                    adminId: actorId,
                    contributionAmount,
                    frequency,
                    maxSlots: dto.maxSlots,
                    serviceCharge: (_a = dto.serviceCharge) !== null && _a !== void 0 ? _a : 0,
                    lateFee: (_b = dto.lateFee) !== null && _b !== void 0 ? _b : 0,
                    gracePeriodDays: (_c = dto.gracePeriodDays) !== null && _c !== void 0 ? _c : 1,
                    status: enums_1.GroupStatus.NOT_STARTED,
                    adminIndemnityAccepted: dto.adminIndemnityAccepted,
                    adminIndemnityAcceptedAt: new Date(),
                    adminIndemnityIpAddress: ipAddress || null,
                },
            });
            const token = (0, crypto_1.randomBytes)(16).toString('hex');
            const link = await tx.joinLink.create({ data: { groupId: g.id, token, createdById: actorId, reusable: true } });
            try {
                await this.notifications.sendNotification({ userId: actorId, type: 'GROUP_CREATED', title: 'Group created', message: `Group ${g.name} created`, payload: { groupId: g.id } });
            }
            catch (err) {
            }
            return { group: g, joinToken: link.token };
        });
    }
    async getGroupDetails(groupId) {
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
            include: {
                admin: { select: { id: true, firstName: true, lastName: true, email: true } },
                cycles: { orderBy: { cycleNumber: 'asc' } },
                _count: { select: { contributors: true } },
            },
        });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        const { _count, ...rest } = group;
        return { ...rest, contributorCount: _count.contributors };
    }
    async getMyStatus(groupId, userId) {
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
            select: { id: true },
        });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        const contributors = await this.prisma.groupContributor.findMany({
            where: { groupId, userId },
            select: { id: true, displayId: true, termsAcceptedAt: true, payoutOrder: true, isActive: true },
            orderBy: { joinedAt: 'asc' },
        });
        return {
            isContributor: contributors.length > 0,
            termsRequired: true,
            contributors: contributors.map((c) => ({
                id: c.id,
                displayId: c.displayId,
                payoutOrder: c.payoutOrder,
                isActive: c.isActive,
                termsAcceptedAt: c.termsAcceptedAt,
            })),
        };
    }
    async searchGroups(filter = {}, opts = {}) {
        const where = {};
        if (filter.name)
            where.name = { contains: filter.name, mode: 'insensitive' };
        if (filter.frequency)
            where.frequency = filter.frequency;
        if (filter.status)
            where.status = filter.status;
        if (filter.contributionAmount !== undefined) {
            where.contributionAmount = filter.contributionAmount;
        }
        else if (filter.contributionAmountMin !== undefined || filter.contributionAmountMax !== undefined) {
            where.contributionAmount = {};
            if (filter.contributionAmountMin !== undefined) {
                where.contributionAmount.gte = filter.contributionAmountMin;
            }
            if (filter.contributionAmountMax !== undefined) {
                where.contributionAmount.lte = filter.contributionAmountMax;
            }
        }
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 200) : 50;
        const skip = (page - 1) * limit;
        const allowedSortFields = ['createdAt', 'name', 'frequency', 'contributionAmount'];
        const sortBy = filter.sortBy && allowedSortFields.includes(filter.sortBy) ? filter.sortBy : 'createdAt';
        const sortOrder = filter.sortOrder === 'asc' ? 'asc' : 'desc';
        const [rows, total] = await Promise.all([
            this.prisma.group.findMany({ where, take: limit, skip, orderBy: { [sortBy]: sortOrder } }),
            this.prisma.group.count({ where }),
        ]);
        return { items: rows, pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } };
    }
    async getRandomJoinableGroups(userId, limit = 5) {
        const joinableGroups = await this.prisma.$queryRaw `
      SELECT g.*, 
        (SELECT COUNT(*) FROM "GroupContributor" WHERE "groupId" = g.id) as "currentMembers"
      FROM "Group" g
      WHERE g.status = 'NOT_STARTED'
        AND g."deletedAt" IS NULL
        AND g."adminId" != ${userId}
        AND (SELECT COUNT(*) FROM "GroupContributor" WHERE "groupId" = g.id) < g."maxSlots"
        AND NOT EXISTS (
          SELECT 1 FROM "GroupContributor" WHERE "groupId" = g.id AND "userId" = ${userId}
        )
      ORDER BY RANDOM()
      LIMIT ${limit}
    `;
        return joinableGroups.map((g) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            frequency: g.frequency,
            contributionAmount: g.contributionAmount,
            maxSlots: g.maxSlots,
            currentMembers: parseInt(g.currentMembers) || 0,
            serviceCharge: g.serviceCharge,
            lateFee: g.lateFee,
        }));
    }
    async getGroupFeed(groupId, opts = {}) {
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = Math.min(opts.limit || 100, 500);
        const skip = (page - 1) * limit;
        const allowedSortFields = ['createdAt', 'action', 'entityType'];
        const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
        const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';
        const cycles = await this.prisma.contributionCycle.findMany({
            where: { groupId },
            select: { id: true },
        });
        const cycleIds = cycles.map(c => c.id);
        const paymentIds = [];
        if (cycleIds.length) {
            const payments = await this.prisma.contributionPayment.findMany({
                where: { cycleId: { in: cycleIds } },
                select: { id: true },
            });
            paymentIds.push(...payments.map(p => p.id));
        }
        const orBranches = [
            { entityType: 'Group', entityId: groupId },
            { metadata: { path: ['groupId'], equals: groupId } },
        ];
        if (cycleIds.length) {
            orBranches.push({ entityType: 'ContributionCycle', entityId: { in: cycleIds } });
        }
        if (paymentIds.length) {
            orBranches.push({ entityType: 'ContributionPayment', entityId: { in: paymentIds } });
        }
        const where = { deletedAt: null, OR: orBranches };
        if (opts.search) {
            where.action = { contains: opts.search, mode: 'insensitive' };
        }
        const [rows, total] = await Promise.all([
            this.prisma.auditLog.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
            this.prisma.auditLog.count({ where }),
        ]);
        const pages = Math.max(1, Math.ceil(total / limit));
        return { items: rows, pagination: { total, page, limit, pages } };
    }
    async updateGroup(actorId, groupId, dto) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { id: true, adminId: true, status: true } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.adminId !== actorId)
            throw new common_1.ForbiddenException('Only the group admin can update the group');
        if (group.status !== enums_1.GroupStatus.NOT_STARTED) {
            const attempted = GroupService_1.CORE_FIELDS.filter((f) => dto[f] !== undefined);
            if (attempted.length > 0) {
                throw new common_1.BadRequestException(`Cannot update ${attempted.join(', ')} after the group has started`);
            }
        }
        const data = {};
        if (dto.name !== undefined)
            data.name = dto.name;
        if (dto.description !== undefined)
            data.description = dto.description;
        if (dto.terms !== undefined)
            data.terms = dto.terms;
        if (dto.contributionAmount !== undefined)
            data.contributionAmount = dto.contributionAmount;
        if (dto.frequency !== undefined)
            data.frequency = dto.frequency;
        if (dto.maxSlots !== undefined) {
            const contributorCount = await this.prisma.groupContributor.count({ where: { groupId, deletedAt: null } });
            if (dto.maxSlots < contributorCount) {
                throw new common_1.BadRequestException(`Cannot set maxSlots (${dto.maxSlots}) lower than current number of contributors (${contributorCount})`);
            }
            data.maxSlots = dto.maxSlots;
        }
        if (dto.serviceCharge !== undefined)
            data.serviceCharge = dto.serviceCharge;
        if (dto.lateFee !== undefined)
            data.lateFee = dto.lateFee;
        if (Object.keys(data).length === 0) {
            throw new common_1.BadRequestException('No fields to update');
        }
        return this.prisma.group.update({ where: { id: groupId }, data });
    }
    async assertKycVerified(userId) {
        const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { bvnVerified: true } });
        if (!u)
            throw new common_1.NotFoundException('User not found');
        if (!u.bvnVerified)
            throw new common_1.ForbiddenException('KYC required to access group functions');
    }
    async assertWalletProvisioned(userId) {
        const wallet = await this.prisma.wallet.findUnique({ where: { userId }, select: { paystackProvisionStatus: true } });
        if (!wallet)
            throw new common_1.NotFoundException('User wallet not found');
        if (wallet.paystackProvisionStatus !== enums_1.PaystackProvisionStatus.PROVISIONED)
            throw new common_1.ForbiddenException('Wallet not provisioned; please wait for virtual account provisioning');
    }
    async freezeGroup(actorId, groupId, reason) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { id: true, status: true, frozenAt: true, name: true } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.frozenAt)
            throw new common_1.BadRequestException('Group is already frozen');
        if (group.status === enums_1.GroupStatus.COMPLETED || group.status === enums_1.GroupStatus.ARCHIVED)
            throw new common_1.BadRequestException('Cannot freeze a completed or archived group');
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.group.update({ where: { id: groupId }, data: { frozenAt: new Date(), frozenReason: reason } });
            await tx.auditLog.create({
                data: { actorId, action: 'group_frozen', entityType: 'Group', entityId: groupId, metadata: { reason } },
            });
            const contributors = await tx.groupContributor.findMany({ where: { groupId }, select: { userId: true } });
            for (const c of contributors) {
                try {
                    await this.notifications.sendNotification({ userId: c.userId, type: 'GROUP_FROZEN', title: 'Group frozen', message: `Group "${group.name}" has been frozen: ${reason}`, payload: { groupId, reason } });
                }
                catch (_) { }
            }
            return updated;
        });
    }
    async unfreezeGroup(actorId, groupId) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { id: true, frozenAt: true, name: true } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (!group.frozenAt)
            throw new common_1.BadRequestException('Group is not frozen');
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.group.update({ where: { id: groupId }, data: { frozenAt: null, frozenReason: null } });
            await tx.auditLog.create({
                data: { actorId, action: 'group_unfrozen', entityType: 'Group', entityId: groupId, metadata: {} },
            });
            const contributors = await tx.groupContributor.findMany({ where: { groupId }, select: { userId: true } });
            for (const c of contributors) {
                try {
                    await this.notifications.sendNotification({ userId: c.userId, type: 'GROUP_UNFROZEN', title: 'Group unfrozen', message: `Group "${group.name}" has been unfrozen`, payload: { groupId } });
                }
                catch (_) { }
            }
            return updated;
        });
    }
    assertNotFrozen(group) {
        if (group.frozenAt)
            throw new common_1.BadRequestException('Group is frozen — no mutations allowed');
    }
    async deleteGroup(actorId, groupId, reason) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { id: true, adminId: true, status: true, frozenAt: true, name: true } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.adminId !== actorId)
            throw new common_1.ForbiddenException('Only the group admin can delete the group');
        if (group.frozenAt)
            throw new common_1.BadRequestException('Group is frozen — no mutations allowed');
        if (group.status !== enums_1.GroupStatus.NOT_STARTED)
            throw new common_1.BadRequestException('Only groups that have not started can be deleted');
        return this.prisma.$transaction(async (tx) => {
            await tx.groupContributor.deleteMany({ where: { groupId } });
            await tx.invitation.deleteMany({ where: { groupId } });
            await tx.group.delete({ where: { id: groupId } });
            return { ok: true };
        });
    }
    async settleGroup(actorId, groupId) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { id: true, adminId: true, status: true, frozenAt: true, name: true } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.adminId !== actorId)
            throw new common_1.ForbiddenException('Only the group admin can settle the group');
        if (group.frozenAt)
            throw new common_1.BadRequestException('Group is frozen — no mutations allowed');
        if (group.status !== enums_1.GroupStatus.COMPLETED)
            throw new common_1.BadRequestException('Only completed groups can be settled');
        const groupWallet = await this.prisma.wallet.findUnique({ where: { groupId } });
        if (!groupWallet)
            throw new common_1.BadRequestException('Group has no wallet');
        const credit = await this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId: groupWallet.id, type: enums_1.TransactionType.CREDIT, status: enums_1.TransactionStatus.SUCCESS } });
        const debit = await this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId: groupWallet.id, type: enums_1.TransactionType.DEBIT, status: enums_1.TransactionStatus.SUCCESS } });
        const creditSum = credit._sum.amount ? Number(credit._sum.amount.toString()) : 0;
        const debitSum = debit._sum.amount ? Number(debit._sum.amount.toString()) : 0;
        const balance = creditSum - debitSum;
        if (balance <= 0)
            throw new common_1.BadRequestException('Group wallet has no remaining balance to settle');
        const adminWallet = await this.prisma.wallet.findUnique({ where: { userId: actorId } });
        if (!adminWallet)
            throw new common_1.BadRequestException('Admin wallet not found');
        const reference = `group-settle:${groupId}`;
        const de = await this.transactions.createDoubleEntry({
            fromWalletId: groupWallet.id,
            toWalletId: adminWallet.id,
            amount: balance.toString(),
            reference,
            status: enums_1.TransactionStatus.SUCCESS,
            metadata: { groupId, type: 'group_settlement', balance },
        });
        await this.prisma.auditLog.create({
            data: { actorId, action: 'group_settled', entityType: 'Group', entityId: groupId, metadata: { amount: balance, txResult: de } },
        });
        await this.prisma.group.update({ where: { id: groupId }, data: { status: enums_1.GroupStatus.ARCHIVED } });
        await this.prisma.groupContributor.updateMany({
            where: { groupId, deletedAt: null },
            data: { isActive: false, deletedAt: new Date() },
        });
        return { ok: true, amount: balance.toFixed(2) };
    }
    async assertGroupContributorOrAdmin(userId, groupId) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { adminId: true } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.adminId === userId)
            return;
        const contributor = await this.prisma.groupContributor.findFirst({ where: { groupId, userId }, select: { id: true } });
        if (!contributor)
            throw new common_1.ForbiddenException('You are not a contributor in this group');
    }
};
exports.GroupService = GroupService;
GroupService.CORE_FIELDS = ['contributionAmount', 'frequency', 'maxSlots', 'serviceCharge', 'lateFee'];
exports.GroupService = GroupService = GroupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notifications_service_1.NotificationsService, transactions_service_1.TransactionsService])
], GroupService);
//# sourceMappingURL=group.service.js.map