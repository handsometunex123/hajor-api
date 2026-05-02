import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { GroupStatus, Frequency, PaystackProvisionStatus, TransactionType, TransactionStatus } from '../../common/enums';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { randomBytes } from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService, private readonly transactions: TransactionsService) {}

  async createGroup(
    actorId: string,
    dto: { name: string; description?: string; maxSlots: number; contributionAmount: number; frequency: Frequency; serviceCharge?: number; lateFee?: number; adminIndemnityAccepted: boolean; gracePeriodDays?: number },
    ipAddress?: string,
  ) {
    // count active groups for this user (NOT_STARTED or STARTED)
    const activeCount = await this.prisma.group.count({ where: { adminId: actorId, status: { in: [GroupStatus.NOT_STARTED, GroupStatus.STARTED] } } });
    if (activeCount >= 2) throw new BadRequestException('User already has maximum number of active groups');
    if (dto.maxSlots < 2) throw new BadRequestException('Group must have at least 2 contributors');
    if (!dto.adminIndemnityAccepted) {
      throw new BadRequestException('You must accept the platform indemnity to create a group.');
    }

    // Create group and its persistent reusable join link in a transaction
    return this.prisma.$transaction(async (tx) => {
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
          serviceCharge: dto.serviceCharge ?? 0,
          lateFee: dto.lateFee ?? 0,
          gracePeriodDays: dto.gracePeriodDays ?? 1,
          status: GroupStatus.NOT_STARTED,
          adminIndemnityAccepted: dto.adminIndemnityAccepted,
          adminIndemnityAcceptedAt: new Date(),
          adminIndemnityIpAddress: ipAddress || null,
        },
      });

      const token = randomBytes(16).toString('hex');
      const link = await tx.joinLink.create({ data: { groupId: g.id, token, createdById: actorId, reusable: true } });

      // send notification to creator
      try {
        await this.notifications.sendNotification({ userId: actorId, type: 'GROUP_CREATED', title: 'Group created', message: `Group ${g.name} created`, payload: { groupId: g.id } });
      } catch (err) {
        // ignore notification failures
      }

      return { group: g, joinToken: link.token };
    });
  }

  async getGroupDetails(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        admin: { select: { id: true, firstName: true, lastName: true, email: true } },
        cycles: { orderBy: { cycleNumber: 'asc' } },
        _count: { select: { contributors: true } },
      },
    });
    if (!group) throw new NotFoundException('Group not found');
    const { _count, ...rest } = group;
    return { ...rest, contributorCount: _count.contributors };
  }

  async getMyStatus(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('Group not found');

    const contributors = await this.prisma.groupContributor.findMany({
      where: { groupId, userId },
      select: { id: true, displayId: true, termsAcceptedAt: true, payoutOrder: true, isActive: true },
      orderBy: { joinedAt: 'asc' },
    });

    return {
      isContributor: contributors.length > 0,
      termsRequired: true, // Platform-wide terms always required
      contributors: contributors.map((c) => ({
        id: c.id,
        displayId: c.displayId,
        payoutOrder: c.payoutOrder,
        isActive: c.isActive,
        termsAcceptedAt: c.termsAcceptedAt,
      })),
    };
  }

  async searchGroups(filter: { name?: string; frequency?: Frequency; status?: GroupStatus; contributionAmount?: number; contributionAmountMin?: number; contributionAmountMax?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}, opts: { page?: number; limit?: number } = {}) {
    const where: any = {};
    if (filter.name) where.name = { contains: filter.name, mode: 'insensitive' };
    if (filter.frequency) where.frequency = filter.frequency;
    if (filter.status) where.status = filter.status;

    // Contribution amount filtering
    if (filter.contributionAmount !== undefined) {
      // Exact amount match
      where.contributionAmount = filter.contributionAmount;
    } else if (filter.contributionAmountMin !== undefined || filter.contributionAmountMax !== undefined) {
      // Range filtering
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

    // Safe sorting with allowlisted fields
    const allowedSortFields = ['createdAt', 'name', 'frequency', 'contributionAmount'];
    const sortBy = filter.sortBy && allowedSortFields.includes(filter.sortBy) ? filter.sortBy : 'createdAt';
    const sortOrder = filter.sortOrder === 'asc' ? 'asc' : 'desc';

    const [rows, total] = await Promise.all([
      this.prisma.group.findMany({ where, take: limit, skip, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.group.count({ where }),
    ]);
    return { items: rows, pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async getRandomJoinableGroups(userId: string, limit: number = 5) {
    // Find groups that are NOT_STARTED and not full
    const joinableGroups = await this.prisma.$queryRaw<any[]>`
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

    return joinableGroups.map((g: any) => ({
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

  async getGroupFeed(groupId: string, opts: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = Math.min(opts.limit || 100, 500);
    const skip = (page - 1) * limit;

    const allowedSortFields = ['createdAt', 'action', 'entityType'];
    const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';

    // Pre-fetch cycle and payment IDs so we can match audit logs whose
    // entityType is ContributionCycle or ContributionPayment without a
    // top-level groupId in their metadata (legacy logs written before this fix).
    const cycles = await this.prisma.contributionCycle.findMany({
      where: { groupId },
      select: { id: true },
    });
    const cycleIds = cycles.map(c => c.id);

    const paymentIds: string[] = [];
    if (cycleIds.length) {
      const payments = await this.prisma.contributionPayment.findMany({
        where: { cycleId: { in: cycleIds } },
        select: { id: true },
      });
      paymentIds.push(...payments.map(p => p.id));
    }

    const orBranches: any[] = [
      // Group-entity logs (freeze, unfreeze, settings changes)
      { entityType: 'Group', entityId: groupId },
      // Any log that stored groupId at the top level of metadata
      // (create_contribution_cycle, complete_contribution_cycle, execute_payout, etc.)
      { metadata: { path: ['groupId'], equals: groupId } },
    ];
    if (cycleIds.length) {
      // Cycle-level logs: payout_marked, create/complete_contribution_cycle by entityId
      orBranches.push({ entityType: 'ContributionCycle', entityId: { in: cycleIds } });
    }
    if (paymentIds.length) {
      // Payment-level logs: record_contribution_payment, worker_auto_debit,
      // admin_mark_payment_paid, waive_late_fee, late_fee_applied
      orBranches.push({ entityType: 'ContributionPayment', entityId: { in: paymentIds } });
    }

    const where: any = { deletedAt: null, OR: orBranches };

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

  /** Core fields that cannot be changed once the group has started */
  private static readonly CORE_FIELDS = ['contributionAmount', 'frequency', 'maxSlots', 'serviceCharge', 'lateFee'] as const;

  async updateGroup(
    actorId: string,
    groupId: string,
    dto: { name?: string; description?: string; terms?: string; contributionAmount?: number; frequency?: Frequency; maxSlots?: number; serviceCharge?: number; lateFee?: number },
  ) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { id: true, adminId: true, status: true } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.adminId !== actorId) throw new ForbiddenException('Only the group admin can update the group');

    // If group has started, block core field changes
    if (group.status !== GroupStatus.NOT_STARTED) {
      const attempted = GroupService.CORE_FIELDS.filter((f) => dto[f] !== undefined);
      if (attempted.length > 0) {
        throw new BadRequestException(`Cannot update ${attempted.join(', ')} after the group has started`);
      }
    }

    const data: Record<string, any> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.terms !== undefined) data.terms = dto.terms;
    if (dto.contributionAmount !== undefined) data.contributionAmount = dto.contributionAmount;
    if (dto.frequency !== undefined) data.frequency = dto.frequency;
    if (dto.maxSlots !== undefined) {
      // Check current number of contributors
      const contributorCount = await this.prisma.groupContributor.count({ where: { groupId, deletedAt: null } });
      if (dto.maxSlots < contributorCount) {
        throw new BadRequestException(`Cannot set maxSlots (${dto.maxSlots}) lower than current number of contributors (${contributorCount})`);
      }
      data.maxSlots = dto.maxSlots;
    }
    if (dto.serviceCharge !== undefined) data.serviceCharge = dto.serviceCharge;
    if (dto.lateFee !== undefined) data.lateFee = dto.lateFee;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    // If terms changed, bump termsVersion and invalidate all contributor acceptances
    // Removed group-specific terms; platform-wide terms enforced

    return this.prisma.group.update({ where: { id: groupId }, data });
  }

  async assertKycVerified(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { bvnVerified: true } });
    if (!u) throw new NotFoundException('User not found');
    if (!u.bvnVerified) throw new ForbiddenException('KYC required to access group functions');
  }

  async assertWalletProvisioned(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId }, select: { paystackProvisionStatus: true } });
    if (!wallet) throw new NotFoundException('User wallet not found');
    if (wallet.paystackProvisionStatus !== PaystackProvisionStatus.PROVISIONED) throw new ForbiddenException('Wallet not provisioned; please wait for virtual account provisioning');
  }

  async freezeGroup(actorId: string, groupId: string, reason: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { id: true, status: true, frozenAt: true, name: true } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.frozenAt) throw new BadRequestException('Group is already frozen');
    if (group.status === GroupStatus.COMPLETED || group.status === GroupStatus.ARCHIVED) throw new BadRequestException('Cannot freeze a completed or archived group');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.group.update({ where: { id: groupId }, data: { frozenAt: new Date(), frozenReason: reason } });

      await tx.auditLog.create({
        data: { actorId, action: 'group_frozen', entityType: 'Group', entityId: groupId, metadata: { reason } },
      });

      // notify all contributors
      const contributors = await tx.groupContributor.findMany({ where: { groupId }, select: { userId: true } });
      for (const c of contributors) {
        try {
          await this.notifications.sendNotification({ userId: c.userId, type: 'GROUP_FROZEN', title: 'Group frozen', message: `Group "${group.name}" has been frozen: ${reason}`, payload: { groupId, reason } });
        } catch (_) {}
      }

      return updated;
    });
  }

  async unfreezeGroup(actorId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { id: true, frozenAt: true, name: true } });
    if (!group) throw new NotFoundException('Group not found');
    if (!group.frozenAt) throw new BadRequestException('Group is not frozen');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.group.update({ where: { id: groupId }, data: { frozenAt: null, frozenReason: null } });

      await tx.auditLog.create({
        data: { actorId, action: 'group_unfrozen', entityType: 'Group', entityId: groupId, metadata: {} },
      });

      const contributors = await tx.groupContributor.findMany({ where: { groupId }, select: { userId: true } });
      for (const c of contributors) {
        try {
          await this.notifications.sendNotification({ userId: c.userId, type: 'GROUP_UNFROZEN', title: 'Group unfrozen', message: `Group "${group.name}" has been unfrozen`, payload: { groupId } });
        } catch (_) {}
      }

      return updated;
    });
  }

  assertNotFrozen(group: { frozenAt?: Date | null }) {
    if (group.frozenAt) throw new BadRequestException('Group is frozen — no mutations allowed');
  }


  async deleteGroup(actorId: string, groupId: string, reason?: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { id: true, adminId: true, status: true, frozenAt: true, name: true } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.adminId !== actorId) throw new ForbiddenException('Only the group admin can delete the group');
    if (group.frozenAt) throw new BadRequestException('Group is frozen — no mutations allowed');
    if (group.status !== GroupStatus.NOT_STARTED) throw new BadRequestException('Only groups that have not started can be deleted');

    return this.prisma.$transaction(async (tx) => {
      // Hard delete contributors
      await tx.groupContributor.deleteMany({ where: { groupId } });
      // Hard delete invitations
      await tx.invitation.deleteMany({ where: { groupId } });
      // Hard delete group
      await tx.group.delete({ where: { id: groupId } });
      return { ok: true };
    });
  }

  async settleGroup(actorId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { id: true, adminId: true, status: true, frozenAt: true, name: true } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.adminId !== actorId) throw new ForbiddenException('Only the group admin can settle the group');
    if (group.frozenAt) throw new BadRequestException('Group is frozen — no mutations allowed');
    if (group.status !== GroupStatus.COMPLETED) throw new BadRequestException('Only completed groups can be settled');

    const groupWallet = await this.prisma.wallet.findUnique({ where: { groupId } });
    if (!groupWallet) throw new BadRequestException('Group has no wallet');

    // Compute group wallet balance
    const credit = await this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId: groupWallet.id, type: TransactionType.CREDIT, status: TransactionStatus.SUCCESS } });
    const debit = await this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId: groupWallet.id, type: TransactionType.DEBIT, status: TransactionStatus.SUCCESS } });
    const creditSum = credit._sum.amount ? Number(credit._sum.amount.toString()) : 0;
    const debitSum = debit._sum.amount ? Number(debit._sum.amount.toString()) : 0;
    const balance = creditSum - debitSum;

    if (balance <= 0) throw new BadRequestException('Group wallet has no remaining balance to settle');

    const adminWallet = await this.prisma.wallet.findUnique({ where: { userId: actorId } });
    if (!adminWallet) throw new BadRequestException('Admin wallet not found');

    const reference = `group-settle:${groupId}`;
    const de = await this.transactions.createDoubleEntry({
      fromWalletId: groupWallet.id,
      toWalletId: adminWallet.id,
      amount: balance.toString(),
      reference,
      status: TransactionStatus.SUCCESS,
      metadata: { groupId, type: 'group_settlement', balance },
    });

    await this.prisma.auditLog.create({
      data: { actorId, action: 'group_settled', entityType: 'Group', entityId: groupId, metadata: { amount: balance, txResult: de } },
    });

    // Archive the group after settlement and deactivate all contributors
    await this.prisma.group.update({ where: { id: groupId }, data: { status: GroupStatus.ARCHIVED } });
    await this.prisma.groupContributor.updateMany({
      where: { groupId, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });

    return { ok: true, amount: balance.toFixed(2) };
  }

  /** Check if user is group admin or a contributor in the group. Throws ForbiddenException if not. */
  async assertGroupContributorOrAdmin(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { adminId: true } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.adminId === userId) return;
    const contributor = await this.prisma.groupContributor.findFirst({ where: { groupId, userId }, select: { id: true } });
    if (!contributor) throw new ForbiddenException('You are not a contributor in this group');
  }
}
