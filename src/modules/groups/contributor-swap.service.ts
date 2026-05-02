import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ContributorSwapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Admin directly swaps two contributors' payout order.
   * Only allowed when group is NOT_STARTED.
   */
  async directSwap(adminId: string, groupId: string, aId: string, bId: string) {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.adminId !== adminId) throw new BadRequestException('Only admin can swap payout order');
      if (group.status !== 'NOT_STARTED') {
        throw new BadRequestException('Direct swap only allowed before group start. Use the swap request flow for a started group.');
      }

      const a = await tx.groupContributor.findUnique({ where: { id: aId } });
      const b = await tx.groupContributor.findUnique({ where: { id: bId } });
      if (!a || !b) throw new NotFoundException('Contributor(s) not found');
      if (a.groupId !== groupId || b.groupId !== groupId) throw new BadRequestException('Both contributors must belong to the group');
      if (typeof a.payoutOrder !== 'number' || typeof b.payoutOrder !== 'number') {
        throw new BadRequestException('Both contributors must have payoutOrder assigned');
      }

      // Swap via null to avoid unique constraint conflicts (payoutOrder is nullable)
      await tx.groupContributor.update({ where: { id: aId }, data: { payoutOrder: null } });
      await tx.groupContributor.update({ where: { id: bId }, data: { payoutOrder: a.payoutOrder } });
      await tx.groupContributor.update({ where: { id: aId }, data: { payoutOrder: b.payoutOrder } });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'direct_swap_payout_order',
          entityType: 'GroupContributor',
          entityId: aId,
          metadata: { groupId, swappedWithId: bId, aPayoutOrder: a.payoutOrder, bPayoutOrder: b.payoutOrder },
        },
      });

      return { success: true };
    });
  }

  /**
   * Smart swap: direct if NOT_STARTED, initiates a request if STARTED.
   */
  async swap(adminId: string, groupId: string, aId: string, bId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.status === 'NOT_STARTED') {
      return this.directSwap(adminId, groupId, aId, bId);
    }
    return this.initiateSwapRequest(adminId, groupId, aId, bId);
  }

  /**
   * Initiates a swap request for a STARTED group.
   * Both contributors must approve before the swap is executed automatically.
   */
  async initiateSwapRequest(adminId: string, groupId: string, aId: string, bId: string) {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.findUnique({ where: { id: groupId }, include: { cycles: true } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.frozenAt) throw new BadRequestException('Group is frozen — no mutations allowed');
      if (group.adminId !== adminId) throw new BadRequestException('Only admin can initiate a swap request');
      if (group.status !== 'STARTED') throw new BadRequestException('Swap requests only apply to started groups');

      const a = await tx.groupContributor.findUnique({ where: { id: aId } });
      const b = await tx.groupContributor.findUnique({ where: { id: bId } });
      if (!a || !b) throw new NotFoundException('Contributor(s) not found');
      if (a.groupId !== groupId || b.groupId !== groupId) throw new BadRequestException('Both contributors must belong to the group');
      if (typeof a.payoutOrder !== 'number' || typeof b.payoutOrder !== 'number') {
        throw new BadRequestException('Both contributors must have payoutOrder assigned');
      }

      // Block if either contributor has already been paid
      for (const contributor of [a, b]) {
        const completedCycle = (group as any).cycles.find(
          (cycle: any) => cycle.cycleNumber === contributor.payoutOrder && cycle.status === 'COMPLETED',
        );
        if (completedCycle) {
          throw new BadRequestException(`Contributor ${contributor.displayId} has already been paid and cannot be swapped`);
        }
      }

      // Block duplicate pending requests for the same pair
      const existing = await tx.contributorSwapRequest.findFirst({
        where: {
          groupId,
          status: 'PENDING',
          OR: [
            { contributorAId: aId, contributorBId: bId },
            { contributorAId: bId, contributorBId: aId },
          ],
        },
      });
      if (existing) throw new BadRequestException('A pending swap request already exists for these contributors');

      const request = await tx.contributorSwapRequest.create({
        data: { groupId, requestedById: adminId, contributorAId: aId, contributorBId: bId },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'initiate_swap_request',
          entityType: 'ContributorSwapRequest',
          entityId: request.id,
          metadata: { groupId, contributorAId: aId, contributorBId: bId },
        },
      });

      try {
        await this.notifications.sendNotification({
          userId: a.userId,
          type: 'SWAP_REQUESTED',
          title: 'Payout order swap requested',
          message: `An admin has requested a payout order swap in group "${(group as any).name}". Your approval is required.`,
          payload: { groupId, requestId: request.id },
        });
      } catch (_) {}
      try {
        await this.notifications.sendNotification({
          userId: b.userId,
          type: 'SWAP_REQUESTED',
          title: 'Payout order swap requested',
          message: `An admin has requested a payout order swap in group "${(group as any).name}". Your approval is required.`,
          payload: { groupId, requestId: request.id },
        });
      } catch (_) {}

      return request;
    });
  }

  /**
   * A contributor approves a pending swap request.
   * When both parties have approved, the swap is executed automatically.
   */
  async approveSwapRequest(userId: string, groupId: string, requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.contributorSwapRequest.findUnique({
        where: { id: requestId },
        include: { contributorA: true, contributorB: true },
      });
      if (!request) throw new NotFoundException('Swap request not found');
      if (request.groupId !== groupId) throw new BadRequestException('Swap request does not belong to this group');
      if (request.status !== 'PENDING') throw new BadRequestException('Swap request has already been processed');

      const isA = request.contributorA.userId === userId;
      const isB = request.contributorB.userId === userId;
      if (!isA && !isB) throw new ForbiddenException('You are not a party to this swap request');

      const updateData: any = {};
      if (isA && !request.contributorAApprovedAt) updateData.contributorAApprovedAt = new Date();
      if (isB && !request.contributorBApprovedAt) updateData.contributorBApprovedAt = new Date();

      const updated = await tx.contributorSwapRequest.update({ where: { id: requestId }, data: updateData });

      const aApproved = updated.contributorAApprovedAt;
      const bApproved = updated.contributorBApprovedAt;

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'approve_swap_request',
          entityType: 'ContributorSwapRequest',
          entityId: requestId,
          metadata: { groupId, side: isA ? 'A' : 'B' },
        },
      });

      if (aApproved && bApproved) {
        const a = request.contributorA;
        const b = request.contributorB;

        // Re-check neither has been paid since request was created
        const group = await tx.group.findUnique({ where: { id: groupId }, include: { cycles: true } });
        for (const contributor of [a, b]) {
          const completedCycle = (group as any).cycles.find(
            (cycle: any) => cycle.cycleNumber === contributor.payoutOrder && cycle.status === 'COMPLETED',
          );
          if (completedCycle) {
            await tx.contributorSwapRequest.update({ where: { id: requestId }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
            throw new BadRequestException(`Contributor ${contributor.displayId} has already been paid — swap cancelled`);
          }
        }

        if (typeof a.payoutOrder !== 'number' || typeof b.payoutOrder !== 'number') {
          throw new BadRequestException('Both contributors must have payoutOrder assigned');
        }

        // Swap via null to avoid unique constraint conflicts (payoutOrder is nullable)
        await tx.groupContributor.update({ where: { id: a.id }, data: { payoutOrder: null } });
        await tx.groupContributor.update({ where: { id: b.id }, data: { payoutOrder: a.payoutOrder } });
        await tx.groupContributor.update({ where: { id: a.id }, data: { payoutOrder: b.payoutOrder } });

        await tx.contributorSwapRequest.update({
          where: { id: requestId },
          data: { status: 'APPROVED', executedAt: new Date() },
        });

        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'execute_swap',
            entityType: 'ContributorSwapRequest',
            entityId: requestId,
            metadata: { groupId, contributorAId: a.id, contributorBId: b.id, aPayoutOrder: a.payoutOrder, bPayoutOrder: b.payoutOrder },
          },
        });

        try {
          await this.notifications.sendNotification({ userId: a.userId, type: 'SWAP_EXECUTED', title: 'Payout order swap executed', message: 'Your payout order has been swapped.', payload: { groupId, requestId } });
        } catch (_) {}
        try {
          await this.notifications.sendNotification({ userId: b.userId, type: 'SWAP_EXECUTED', title: 'Payout order swap executed', message: 'Your payout order has been swapped.', payload: { groupId, requestId } });
        } catch (_) {}

        return { status: 'EXECUTED', requestId };
      }

      // Notify the other party
      try {
        const otherUserId = isA ? request.contributorB.userId : request.contributorA.userId;
        await this.notifications.sendNotification({
          userId: otherUserId,
          type: 'SWAP_APPROVED',
          title: 'Swap approved — awaiting your approval',
          message: 'The other contributor has approved the payout order swap. It is awaiting your approval.',
          payload: { groupId, requestId },
        });
      } catch (_) {}

      return { status: 'AWAITING_OTHER_APPROVAL', requestId };
    });
  }

  /**
   * A contributor rejects a pending swap request.
   */
  async rejectSwapRequest(userId: string, groupId: string, requestId: string) {
    const request = await this.prisma.contributorSwapRequest.findUnique({
      where: { id: requestId },
      include: { contributorA: true, contributorB: true },
    });
    if (!request) throw new NotFoundException('Swap request not found');
    if (request.groupId !== groupId) throw new BadRequestException('Swap request does not belong to this group');
    if (request.status !== 'PENDING') throw new BadRequestException('Swap request has already been processed');

    const isA = request.contributorA.userId === userId;
    const isB = request.contributorB.userId === userId;
    if (!isA && !isB) throw new ForbiddenException('You are not a party to this swap request');

    await this.prisma.contributorSwapRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', rejectedById: userId, rejectedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'reject_swap_request',
        entityType: 'ContributorSwapRequest',
        entityId: requestId,
        metadata: { groupId, side: isA ? 'A' : 'B' },
      },
    });

    try {
      await this.notifications.sendNotification({
        userId: request.requestedById,
        type: 'SWAP_REJECTED',
        title: 'Swap request rejected',
        message: 'A contributor has rejected the payout order swap request.',
        payload: { groupId, requestId },
      });
    } catch (_) {}

    return { success: true };
  }

  /**
   * Admin cancels a pending swap request.
   */
  async cancelSwapRequest(adminId: string, groupId: string, requestId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.adminId !== adminId) throw new BadRequestException('Only admin can cancel a swap request');

    const request = await this.prisma.contributorSwapRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Swap request not found');
    if (request.groupId !== groupId) throw new BadRequestException('Swap request does not belong to this group');
    if (request.status !== 'PENDING') throw new BadRequestException('Only pending swap requests can be cancelled');

    await this.prisma.contributorSwapRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'cancel_swap_request',
        entityType: 'ContributorSwapRequest',
        entityId: requestId,
        metadata: { groupId },
      },
    });

    return { success: true };
  }

  /**
   * Lists swap requests for a group. Admin only.
   */
  async listSwapRequests(adminId: string, groupId: string, status?: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.adminId !== adminId) throw new BadRequestException('Only admin can list swap requests');

    const where: any = { groupId };
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
    if (status && validStatuses.includes(status)) where.status = status;

    return this.prisma.contributorSwapRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        contributorA: {
          select: { id: true, displayId: true, payoutOrder: true, user: { select: { id: true, firstName: true, lastName: true } } },
        },
        contributorB: {
          select: { id: true, displayId: true, payoutOrder: true, user: { select: { id: true, firstName: true, lastName: true } } },
        },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
