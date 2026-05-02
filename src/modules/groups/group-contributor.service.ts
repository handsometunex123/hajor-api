import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { acquireAdvisoryXactLock } from '../../infrastructure/db/advisory-lock';
import { createContributorWithDisplayId } from '../../common/utils/generate-display-id';

@Injectable()
export class GroupContributorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async addSelfSlot(userId: string, groupId: string) {
    return this.prisma.$transaction(async (tx) => {
      await acquireAdvisoryXactLock(tx, groupId);

      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.frozenAt) throw new BadRequestException('Group is frozen — no mutations allowed');
      if (group.status !== 'NOT_STARTED') throw new BadRequestException('Can only add contributors while group is NOT_STARTED');

      const total = await tx.groupContributor.count({ where: { groupId } });
      if (total >= group.maxSlots) throw new BadRequestException('Group is already full');

      const userSlots = await tx.groupContributor.count({ where: { groupId, userId } });
      if (userSlots === 0) {
        throw new BadRequestException('You must already be a contributor to claim a second slot.');
      }
      if (userSlots >= 2) throw new BadRequestException('You already have the maximum slots in this group');

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const slotNumber = userSlots + 1;
      const contributor = await createContributorWithDisplayId(tx, {
        groupId, userId, firstName: user.firstName, lastName: user.lastName, slotNumber,
      }, {
        joinMethod: 'admin_add',
        payoutOrder: total + 1,
      });

      // Auto-accept terms if user is the group admin
      if (group.adminId === userId) {
        await tx.groupContributor.update({ where: { id: contributor.id }, data: { termsAcceptedAt: new Date(), termsVersionAccepted: (group as any).termsVersion ?? 1 } });
      }

      return contributor;
    });
  }

  async removeContributor(adminId: string, groupId: string, contributorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const contributor = await tx.groupContributor.findUnique({ where: { id: contributorId } });
      if (!contributor) throw new NotFoundException('Contributor not found');
      if (contributor.groupId !== groupId) throw new BadRequestException('Contributor does not belong to group');

      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.status !== 'NOT_STARTED') {
        // check if contributor has any payments
        const payments = await tx.contributionPayment.count({ where: { groupContributorId: contributorId } });
        if (payments > 0) throw new BadRequestException('Contributor has payments; removal not allowed');
      }

      if (group.adminId !== adminId) throw new BadRequestException('Only admin can remove contributors');

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

  async listContributors(
    groupId: string,
    opts: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc'; isActive?: boolean } = {},
  ) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');

    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const allowedSortFields = ['joinedAt', 'payoutOrder'];
    const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'joinedAt';
    const sortOrder = opts.sortOrder === 'desc' ? 'desc' : 'asc';

    // Build where clause
    const where: any = { groupId };
    if (opts.isActive !== undefined) where.isActive = opts.isActive;
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

  async swapPayoutOrder(adminId: string, groupId: string, aId: string, bId: string) {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.adminId !== adminId) throw new BadRequestException('Only admin can swap payout order');
      if (group.status !== 'NOT_STARTED') throw new BadRequestException('Swapping payout order only allowed before group start');

      const a = await tx.groupContributor.findUnique({ where: { id: aId } });
      const b = await tx.groupContributor.findUnique({ where: { id: bId } });
      if (!a || !b) throw new NotFoundException('Contributor(s) not found');
      if (a.groupId !== groupId || b.groupId !== groupId) throw new BadRequestException('Both contributors must belong to the group');

      // Ensure both contributors have payoutOrder assigned
      if (typeof a.payoutOrder !== 'number' || typeof b.payoutOrder !== 'number') {
        throw new BadRequestException('Both contributors must have payoutOrder assigned to swap');
      }

      // Safe swap using a temporary value to avoid unique constraint conflicts
      const temp = -Date.now();
      await tx.groupContributor.update({ where: { id: aId }, data: { payoutOrder: temp } });
      await tx.groupContributor.update({ where: { id: bId }, data: { payoutOrder: a.payoutOrder } });
      await tx.groupContributor.update({ where: { id: aId }, data: { payoutOrder: b.payoutOrder } });

      return { success: true };
    });
  }

  async acceptTerms(userId: string, groupId: string, contributorId: string) {
    const contributor = await this.prisma.groupContributor.findUnique({ where: { id: contributorId } });
    if (!contributor) throw new NotFoundException('Contributor not found');
    if (contributor.groupId !== groupId) throw new BadRequestException('Contributor does not belong to this group');
    if (contributor.userId !== userId) throw new BadRequestException('You can only accept terms for your own slot');
    if (contributor.termsAcceptedAt) return { success: true, termsAcceptedAt: contributor.termsAcceptedAt };

    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    // Platform-wide terms are enforced; no group-specific terms check

    const updated = await this.prisma.groupContributor.update({
      where: { id: contributorId },
      data: { termsAcceptedAt: new Date(), termsVersionAccepted: (group as any).termsVersion ?? 1 },
    });
    return { success: true, termsAcceptedAt: updated.termsAcceptedAt };
  }

  async nudgeTerms(adminId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.adminId !== adminId) throw new BadRequestException('Only the group admin can send term reminders');
    // Platform-wide terms are enforced; no group-specific terms check

    const pending = await this.prisma.groupContributor.findMany({
      where: { groupId, termsAcceptedAt: null },
      select: { id: true, userId: true },
    });

    if (pending.length === 0) return { sent: 0, message: 'All contributors have already accepted terms' };

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
      } catch (_) { /* best-effort */ }
    }

    return { sent, total: pending.length };
  }
}
