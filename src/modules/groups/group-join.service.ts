import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { acquireAdvisoryXactLock } from '../../infrastructure/db/advisory-lock';
import { createContributorWithDisplayId } from '../../common/utils/generate-display-id';
import { JoinRequestStatus } from '@prisma/client';

@Injectable()
export class GroupJoinService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async listJoinRequests(actorId: string, groupId: string, status?: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.adminId !== actorId) throw new BadRequestException('Only admin can view join requests');
    const where: any = { groupId };
    if (status && Object.values(JoinRequestStatus).includes(status as any)) {
      where.status = status as JoinRequestStatus;
    }
    return this.prisma.groupJoinRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async requestToJoin(userId: string, groupId: string, acceptTerms: boolean) {
    if (!acceptTerms) throw new BadRequestException('You must accept the group terms and conditions to join.');
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.frozenAt) throw new BadRequestException('Group is frozen — no mutations allowed');
      if (group.status !== 'NOT_STARTED') throw new BadRequestException('Cannot request to join after group has started');

      const alreadyContributor = await tx.groupContributor.findFirst({ where: { groupId, userId } });
      if (alreadyContributor) throw new BadRequestException('User is already a contributor');
      const existingReq = await tx.groupJoinRequest.findFirst({ where: { groupId, userId, status: 'PENDING' } });
      if (existingReq) throw new BadRequestException('Join request already pending');

      const req = await tx.groupJoinRequest.create({ data: { groupId, userId, acceptedTerms: true } });
      return req;
    });
  }

  async approveJoinRequest(adminId: string, requestId: string, acceptIndemnity: boolean) {
    if (!acceptIndemnity) throw new BadRequestException('Admin must accept indemnity for the new user before approval.');
    return this.prisma.$transaction(async (tx) => {
      // acquire advisory lock for group associated with this request
      let req: any;
      try {
        const maybeReq = await tx.groupJoinRequest.findUnique({ where: { id: requestId } });
        if (maybeReq) await acquireAdvisoryXactLock(tx, maybeReq.groupId);
        req = maybeReq;
      } catch (err) {
        // fallback: continue without lock
        req = await tx.groupJoinRequest.findUnique({ where: { id: requestId } });
      }
      if (!req) throw new NotFoundException('Join request not found');

      // Ensure join request is still pending
      if (req.status !== 'PENDING') {
        throw new BadRequestException('Join request has already been processed.');
      }

      const group = await tx.group.findUnique({ where: { id: req.groupId } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.frozenAt) throw new BadRequestException('Group is frozen — no mutations allowed');
      if (group.adminId !== adminId) throw new BadRequestException('Only admin can approve requests');
      if (group.status !== 'NOT_STARTED') throw new BadRequestException('Cannot approve join requests after group has started');

      const total = await tx.groupContributor.count({ where: { groupId: group.id } });
      if (total >= group.maxSlots) throw new BadRequestException('Group is full');

      const userSlots = await tx.groupContributor.count({ where: { groupId: group.id, userId: req.userId } });
      if (userSlots >= 2) throw new BadRequestException('User already has maximum contributors in this group');

      const joiner = await tx.user.findUnique({ where: { id: req.userId } });
      const contributor = await createContributorWithDisplayId(
        tx,
        {
          groupId: group.id,
          userId: req.userId,
          firstName: joiner?.firstName,
          lastName: joiner?.lastName,
          slotNumber: userSlots + 1,
        },
        {
          termsAcceptedAt: new Date(),
          termsVersionAccepted: group.termsVersion ?? 1,
          joinMethod: 'join_request',
          payoutOrder: total + 1,
        }
      );
      await tx.groupJoinRequest.update({ where: { id: requestId }, data: { status: 'APPROVED', adminAcceptedIndemnity: true } });

      // notify admin that join request was approved
      try {
        await this.notifications.sendNotification({ userId: group.adminId, type: 'JOIN_APPROVED', title: 'Join request approved', message: `A join request was approved for group ${group.name}`, payload: { groupId: group.id, userId: req.userId } });
      } catch (err) {
        // ignore
      }

      return { contributor };
    });
  }

  async rejectJoinRequest(adminId: string, requestId: string) {
    const req = await this.prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Join request not found');

    const group = await this.prisma.group.findUnique({ where: { id: req.groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.adminId !== adminId) throw new BadRequestException('Only admin can reject requests');

    await this.prisma.groupJoinRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
    return { success: true };
  }
}
