import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentQueueService } from '../../infrastructure/queue/payment-queue.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { NotificationsService } from '../notifications/notifications.service';
import { acquireAdvisoryXactLock } from '../../infrastructure/db/advisory-lock';

@Injectable()
export class GroupLifecycleService {
  constructor(private readonly prisma: PrismaService, private readonly paymentQueue: PaymentQueueService, private readonly queue: QueueService, private readonly notifications: NotificationsService) {}

  private addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  }

  private addMonths(date: Date, months: number) {
    const d = new Date(date);
    d.setUTCMonth(d.getUTCMonth() + months);
    return d;
  }

  async startGroup(adminId: string, groupId: string, options?: { firstContributionDate?: Date }) {
    const createdCycles = await this.prisma.$transaction(async (tx) => {
      // acquire advisory lock for group to serialize startGroup operations
      try {
        await acquireAdvisoryXactLock(tx, groupId);
      } catch (err) {
        // noop
      }
      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.frozenAt) throw new BadRequestException('Group is frozen — no mutations allowed');
      if (group.adminId !== adminId) throw new BadRequestException('Only admin can start the group');
      if (group.status !== 'NOT_STARTED') throw new BadRequestException('Group must be NOT_STARTED to start');

      const contributors = await tx.groupContributor.findMany({ where: { groupId }, orderBy: { joinedAt: 'asc' } });
      if (contributors.length !== group.maxSlots) throw new BadRequestException('Group must be full to start');

      // All contributors must have accepted the group terms before starting
      // All contributors must have accepted the platform terms before starting
      const pending = contributors.filter((c) => !c.termsAcceptedAt);
      if (pending.length > 0) {
        throw new BadRequestException(`All contributors must accept the platform terms before starting. ${pending.length} contributor(s) have not yet accepted.`);
      }

      // generate cycles (number = contributors.length)
      const now = new Date();
      const anchor = options?.firstContributionDate ?? now;
      const gracePeriodDays = (group as any).gracePeriodDays ?? 1;
      const cycles = [] as any[];
      for (let i = 0; i < contributors.length; i++) {
        let contributionDate: Date;
        if (group.frequency === 'WEEKLY') {
          contributionDate = this.addDays(anchor, i * 7);
        } else {
          contributionDate = this.addMonths(anchor, i);
        }
        // payoutDate = contributionDate + gracePeriodDays + 1 day
        const payoutDate = this.addDays(contributionDate, gracePeriodDays + 1);
        cycles.push({ groupId, cycleNumber: i + 1, contributionDate, payoutDate, status: 'PENDING' });
      }

      // create cycles and collect created rows
      const created: any[] = [];
      for (const c of cycles) {
        const row = await tx.contributionCycle.create({ data: c });
        created.push(row);
      }
      // group wallet creation removed — not needed for current ledger-first flow

      await tx.group.update({ where: { id: groupId }, data: { status: 'STARTED', startDate: now, firstContributionDate: anchor } as any });
      return created;
    });

    // schedule auto-debit jobs for created cycles (do not run inside transaction)
    for (const c of createdCycles) {
      try {
        await this.paymentQueue.scheduleAutoDebit({ id: c.id, contributionDate: c.contributionDate });
      } catch (err) {
        // log but do not fail startGroup
        // eslint-disable-next-line no-console
        console.warn('Failed to schedule auto-debit for cycle', c.id, err?.message || err);
      }
    }

    // notify admin and contributors that group has started
    try {
      const adminNote = this.notifications.sendNotification({ userId: createdCycles[0] ? (await this.prisma.group.findUnique({ where: { id: createdCycles[0].groupId }, select: { adminId: true } })).adminId : null, type: 'GROUP_STARTED', title: 'Group started', message: 'Your group has started', payload: { groupId } });
      // notify contributors
      const contributors = await this.prisma.groupContributor.findMany({ where: { groupId } });
      for (const contrib of contributors) {
        try {
          await this.notifications.sendNotification({ userId: contrib.userId, type: 'GROUP_STARTED', title: 'Group started', message: `Group you joined has started`, payload: { groupId, cycleIds: createdCycles.map((c) => c.id) } });
        } catch (err) {
          // ignore per-user failures
        }
      }
      await adminNote;
    } catch (err) {
      // ignore notification delivery failures
    }

    return { success: true, cycles: createdCycles.map((c) => c.id) };
  }

  /**
   * Admin manually triggers payout for a cycle that is still COLLECTING.
   * Marks remaining FAILED/UNPAID payments as DEFAULTED, completes the cycle,
   * and enqueues the payout job.
   */
  async forcePayoutCycle(adminId: string, groupId: string, cycleId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.adminId !== adminId) throw new BadRequestException('Only the group admin can trigger a manual payout');
    if (group.frozenAt) throw new BadRequestException('Group is frozen — no mutations allowed');

    const cycle = await this.prisma.contributionCycle.findUnique({ where: { id: cycleId }, include: { payments: true } });
    if (!cycle) throw new NotFoundException('Cycle not found');
    if (cycle.groupId !== groupId) throw new BadRequestException('Cycle does not belong to this group');
    if (cycle.status === 'COMPLETED') throw new BadRequestException('Cycle is already completed');
    if (cycle.status !== 'COLLECTING') throw new BadRequestException('Cycle must be in COLLECTING status to force payout');

    // Mark FAILED/UNPAID payments as DEFAULTED and complete the cycle atomically
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

    // Enqueue payout job
    await this.queue.addPayoutJob('process-payout', { cycleId }, { jobId: `force_payout_${cycleId}_${Date.now()}`, removeOnComplete: true });

    return { ok: true, cycleId };
  }

  /**
   * Direct reschedule for PENDING cycles (contribution not yet started).
   * Admin can call this without any approval. All safety guards apply:
   *   - New date must be in the future
   *   - New date must be later than the current scheduled date
   *   - Cannot push more than one frequency interval (7d WEEKLY / 30d MONTHLY)
   *   - Cascades the delta to all subsequent PENDING cycles
   *   - Syncs group.firstContributionDate if Cycle 1 is affected
   *   - Notifies all contributors and writes an audit log
   */
  async rescheduleCycle(adminId: string, groupId: string, cycleId: string, newDate: Date, reason: string) {
    if (newDate <= new Date()) throw new BadRequestException('New contribution date must be in the future');

    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.adminId !== adminId) throw new BadRequestException('Only the group admin can reschedule cycles');
    if (group.status !== 'STARTED') throw new BadRequestException('Can only reschedule cycles on a started group');
    if (group.frozenAt) throw new BadRequestException('Group is frozen — no mutations allowed');

    const cycle = await this.prisma.contributionCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundException('Cycle not found');
    if (cycle.groupId !== groupId) throw new BadRequestException('Cycle does not belong to this group');
    if (cycle.status !== 'PENDING') throw new BadRequestException('Only PENDING (not yet collecting) cycles can be rescheduled directly — raise a reschedule-request for cycles that are already collecting');
    if (newDate <= cycle.contributionDate) throw new BadRequestException('New contribution date must be later than the current scheduled date');

    // Cap: cannot push further than one frequency interval
    const maxDeltaMs = group.frequency === 'WEEKLY' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const maxLabel = group.frequency === 'WEEKLY' ? '7 days' : '30 days';
    const deltaMs = newDate.getTime() - cycle.contributionDate.getTime();
    if (deltaMs > maxDeltaMs) throw new BadRequestException(`Cannot push the contribution date by more than ${maxLabel} (one ${group.frequency === 'WEEKLY' ? 'week' : 'month'} interval)`);

    // Cascade: shift all PENDING cycles from this one onward by the same delta
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

    // Sync group.firstContributionDate if Cycle 1 was shifted
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

    // Notify all contributors
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
      } catch (_) {}
    }

    const updatedCycles = await this.prisma.contributionCycle.findMany({
      where: { id: { in: pendingCycles.map((c) => c.id) } },
      orderBy: { cycleNumber: 'asc' },
    });

    return { ok: true, rescheduledCount: pendingCycles.length, cycles: updatedCycles };
  }

  /**
   * Admin raises a reschedule request for a COLLECTING cycle (already debiting).
   * Creates a CYCLE_RESCHEDULE ticket that super admin must approve before any date changes.
   */
  async requestCycleReschedule(adminId: string, groupId: string, cycleId: string, requestedDate: Date, reason: string) {
    if (requestedDate <= new Date()) throw new BadRequestException('Requested date must be in the future');

    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.adminId !== adminId) throw new BadRequestException('Only the group admin can request a cycle reschedule');
    if (group.status !== 'STARTED') throw new BadRequestException('Can only request reschedule on a started group');
    if (group.frozenAt) throw new BadRequestException('Group is frozen — no mutations allowed');

    const cycle = await this.prisma.contributionCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundException('Cycle not found');
    if (cycle.groupId !== groupId) throw new BadRequestException('Cycle does not belong to this group');
    if (cycle.status === 'COMPLETED') throw new BadRequestException('Cannot reschedule a completed cycle');
    if (cycle.status === 'PENDING') throw new BadRequestException('Cycle has not started collecting yet — use PATCH /groups/:id/cycles/:cycleId/reschedule to reschedule directly');
    // cycle.status === 'COLLECTING' from here on
    if (requestedDate <= cycle.contributionDate) throw new BadRequestException('Requested date must be later than the current scheduled date');

    // Block duplicate pending requests for the same cycle
    const existing = await this.prisma.ticket.findFirst({
      where: { type: 'CYCLE_RESCHEDULE', cycleId, status: { in: ['PENDING', 'UNDER_REVIEW'] } } as any,
    });
    if (existing) throw new BadRequestException('A reschedule request for this cycle is already pending super admin review');

    const ticket = await this.prisma.ticket.create({
      data: {
        type: 'CYCLE_RESCHEDULE',
        groupId,
        userId: adminId,
        cycleId,
        requestedDate,
        reason,
        status: 'PENDING',
      } as any,
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

    // Notify all super admins
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
      } catch (_) {}
    }

    return { ok: true, ticketId: ticket.id, message: 'Reschedule request submitted for super admin approval' };
  }

  /**
   * Super admin approves a CYCLE_RESCHEDULE ticket. Executes the cascade reschedule and notifies contributors.
   */
  async approveCycleReschedule(superAdminId: string, ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId }, include: { group: true } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if ((ticket as any).type !== 'CYCLE_RESCHEDULE') throw new BadRequestException('This ticket is not a cycle reschedule request');
    if (ticket.status !== 'PENDING' && ticket.status !== 'UNDER_REVIEW') throw new BadRequestException('Ticket is no longer pending approval');

    const cycleId: string = (ticket as any).cycleId;
    const requestedDate = new Date((ticket as any).requestedDate);
    if (!cycleId || !(ticket as any).requestedDate) throw new BadRequestException('Ticket is missing cycle or date information');

    const cycle = await this.prisma.contributionCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundException('Cycle not found');
    if (cycle.groupId !== ticket.groupId) throw new BadRequestException('Cycle does not belong to this group');
    if (cycle.status !== 'PENDING') throw new BadRequestException('Cycle is no longer PENDING — cannot be rescheduled');
    if (requestedDate <= new Date()) throw new BadRequestException('The requested date is now in the past — cannot approve this reschedule');

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

    // Notify contributors
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
      } catch (_) {}
    }

    // Notify the requesting admin
    try {
      await this.notifications.sendNotification({
        userId: ticket.userId,
        type: 'CYCLE_RESCHEDULE_APPROVED',
        title: 'Reschedule request approved',
        message: `Your request to reschedule cycle ${cycle.cycleNumber} has been approved. New date: ${requestedDate.toDateString()}.`,
        payload: { ticketId, groupId: ticket.groupId, cycleId, newDate: requestedDate.toISOString() },
      });
    } catch (_) {}

    const updatedCycles = await this.prisma.contributionCycle.findMany({
      where: { id: { in: pendingCycles.map((c) => c.id) } },
      orderBy: { cycleNumber: 'asc' },
    });

    return { ok: true, rescheduledCount: pendingCycles.length, cycles: updatedCycles };
  }

  /**
   * Super admin rejects a CYCLE_RESCHEDULE ticket and notifies the group admin.
   */
  async rejectCycleReschedule(superAdminId: string, ticketId: string, notes?: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if ((ticket as any).type !== 'CYCLE_RESCHEDULE') throw new BadRequestException('This ticket is not a cycle reschedule request');
    if (ticket.status !== 'PENDING' && ticket.status !== 'UNDER_REVIEW') throw new BadRequestException('Ticket is no longer pending approval');

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'REJECTED', adminNotes: notes ?? null, resolvedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: superAdminId,
        action: 'reject_cycle_reschedule',
        entityType: 'Ticket',
        entityId: ticketId,
        metadata: { groupId: ticket.groupId, cycleId: (ticket as any).cycleId, notes: notes ?? null },
      },
    });

    try {
      await this.notifications.sendNotification({
        userId: ticket.userId,
        type: 'CYCLE_RESCHEDULE_REJECTED',
        title: 'Reschedule request rejected',
        message: `Your request to reschedule a contribution cycle has been rejected.${notes ? ` Reason: ${notes}` : ''}`,
        payload: { ticketId, groupId: ticket.groupId, cycleId: (ticket as any).cycleId, notes: notes ?? null },
      });
    } catch (_) {}

    return { ok: true, ticketId };
  }
}
