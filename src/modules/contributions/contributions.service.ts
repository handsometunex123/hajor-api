import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { acquireAdvisoryXactLock } from '../../infrastructure/db/advisory-lock';
import { TransactionsService } from '../transactions/transactions.service';
import { AuditService } from '../../common/audit/audit.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Injectable()
export class ContributionsService {
  private readonly logger = new Logger(ContributionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly transactions: TransactionsService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Idempotent creation of a contribution cycle for a group.
   * Also creates ContributionPayment records for active group contributors.
   */
  async createCycle(params: {
    groupId: string;
    cycleNumber: number;
    contributionDate: Date;
    payoutDate: Date;
  }) {
    const { groupId, cycleNumber, contributionDate, payoutDate } = params;

    // Validate payoutDate > contributionDate
    if (payoutDate <= contributionDate) {
      throw new BadRequestException('payoutDate must be after contributionDate');
    }

    // Atomic idempotency check + creation with advisory lock to prevent concurrent duplicates
    const created = await this.prisma.$transaction(async (tx) => {
      try {
        await acquireAdvisoryXactLock(tx, groupId);
      } catch (err) {
        // ignore if lock helper missing
      }

      // Idempotency check inside transaction
      const existing = await tx.contributionCycle.findFirst({
        where: { groupId, cycleNumber },
      });
      if (existing) return existing;

      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new BadRequestException('Group not found');

      // Validate cycleNumber is sequential
      const maxCycle = await tx.contributionCycle.findFirst({
        where: { groupId },
        orderBy: { cycleNumber: 'desc' },
        select: { cycleNumber: true },
      });
      const expectedNext = (maxCycle?.cycleNumber ?? 0) + 1;
      if (cycleNumber !== expectedNext) {
        throw new BadRequestException(`cycleNumber must be ${expectedNext} (sequential)`);
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

      // fetch contributors (each contributor row represents one slot) ordered by payoutOrder then joinedAt
      const contributors = await tx.groupContributor.findMany({ where: { groupId }, orderBy: [{ payoutOrder: 'asc' }, { joinedAt: 'asc' }] });

      // prepare payments
      const paymentsData = contributors.map((m) => ({
        cycleId: cycle.id,
        groupContributorId: m.id,
        amount: group.contributionAmount,
        status: 'UNPAID' as any,
      }));

      if (paymentsData.length > 0) {
        await tx.contributionPayment.createMany({ data: paymentsData as any });
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
    // Schedule payment reminders for contributors (non-blocking)
    try {
      const leadSeconds = parseInt(process.env.REMINDER_LEAD_SECONDS || '86400', 10); // default 1 day
      const leadMs = Number.isNaN(leadSeconds) ? 86400 * 1000 : leadSeconds * 1000;
      const contributorsPost = await this.prisma.groupContributor.findMany({ where: { groupId } });
      const contributionDate = typeof created.contributionDate === 'string' ? new Date(created.contributionDate) : created.contributionDate;
      let delay = contributionDate.getTime() - Date.now() - leadMs;
      if (delay < 0) delay = 0;
      for (const m of contributorsPost) {
        try {
          await this.queue.addNotificationJob('send-notification', { userId: m.userId, type: 'PAYMENT_REMINDER', payload: { cycleId: created.id, groupId } }, { jobId: `reminder:${created.id}:${m.id}`, delay, attempts: 1, removeOnComplete: true });
        } catch (err) {
          this.logger.warn('Failed to enqueue payment reminder', err?.message || err);
        }
      }
    } catch (err) {
      this.logger.warn('Failed to schedule payment reminders', err?.message || err);
    }

    return created;
  }

  /**
   * Check whether a cycle is complete (all payments PAID) and atomically mark it completed and enqueue payout.
   */
  async checkCycleCompletion(cycleId: string) {
    // Use advisory lock per-cycle to avoid double-triggering
    const res = await this.prisma.$transaction(async (tx) => {
      try {
        await acquireAdvisoryXactLock(tx, cycleId);
      } catch (err) {
        // ignore if lock helper missing
      }

      const cycle = await tx.contributionCycle.findUnique({ where: { id: cycleId }, include: { payments: true } });
      if (!cycle) throw new NotFoundException('Cycle not found');

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
      } catch (err) {
        this.logger.warn('Failed to enqueue payout job', err?.message || err);
      }
      this.logger.log(`Cycle ${cycleId} completed and payout enqueued`);
    }
    return res;
  }

  async getCurrentCycle(groupId: string) {
    const cycle = await this.prisma.contributionCycle.findFirst({
      where: { groupId, status: { not: 'COMPLETED' } },
      orderBy: { cycleNumber: 'asc' },
      include: { payments: { include: { groupContributor: { include: { user: true } } } } },
    });
    return cycle || null;
  }

  async getDefaulters(cycleId: string, opts?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
    const page = opts?.page && opts.page > 0 ? opts.page : 1;
    const limit = opts?.limit && opts.limit > 0 ? Math.min(500, opts.limit) : 100;
    const skip = (page - 1) * limit;

    const allowedSortFields = ['createdAt', 'status'];
    const sortBy = opts?.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortOrder = opts?.sortOrder === 'desc' ? 'desc' : 'asc';

    const where = { cycleId, status: { not: 'PAID' as const } };

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

  async getPendingPaymentsForCycle(cycleId: string) {
    return this.prisma.contributionPayment.findMany({ where: { cycleId, status: 'UNPAID' }, include: { groupContributor: { include: { user: true } } } });
  }

  async getGroupContributionStatus(groupId: string) {
    const current = await this.getCurrentCycle(groupId);
    if (!current) return { current: null, paid: [], unpaid: [], defaulters: [] };

    const paid = current.payments.filter((p) => p.status === 'PAID').map((p) => p.groupContributor);
    const unpaid = current.payments.filter((p) => p.status !== 'PAID').map((p) => p.groupContributor);
    const defaulters = current.payments.filter((p) => p.status !== 'PAID' && current.payoutDate < new Date()).map((p) => p.groupContributor);

    return { current, paid, unpaid, defaulters };
  }

  // Read-heavy: return a small group summary useful for listing UIs (cached short TTL)
  async getGroupSummary(groupId: string) {
    const key = `group:summary:${groupId}`;
    try {
      const cached = await this.redis.get(key);
      if (cached) return cached;
    } catch (err) {
      // ignore cache errors
    }

    const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { id: true, name: true, contributionAmount: true, frequency: true, status: true, createdAt: true } });
    if (!group) throw new BadRequestException('Group not found');
    const contributorCount = await this.prisma.groupContributor.count({ where: { groupId } });
    const summary = { ...group, contributorCount };
    try {
      await this.redis.set(key, summary, 60);
    } catch (err) {}
    return summary;
  }

  /**
   * Record a contribution payment made by a group contributor idempotently.
   * Ensures transaction ledger entry is idempotent via reference and marks payment PAID.
   */
  async recordContributionPayment(params: {
    cycleId: string;
    groupContributorId: string;
    reference: string;
    amount: string | number;
    payerWalletId: string;
  }) {
    const { cycleId, groupContributorId, reference, amount, payerWalletId } = params;

    // find payment and include cycle.group to validate expected amount
    const payment = await this.prisma.contributionPayment.findFirst({
      where: { cycleId, groupContributorId },
      include: { cycle: { include: { group: true } }, groupContributor: true },
    });
    if (!payment) throw new BadRequestException('Contribution payment record not found');

    if (payment.status === 'PAID') {
      this.logger.debug(`Payment ${payment.id} already PAID`);
      return { payment, transaction: null };
    }

    // explicit guard: do not allow payments for completed cycles
    if (payment.cycle && payment.cycle.status === 'COMPLETED') {
      throw new BadRequestException('Cannot pay for a completed cycle');
    }

    // validate amount equals group's configured contributionAmount
    const expected = payment.cycle?.group?.contributionAmount;
    if (expected != null) {
      const expectedStr = expected.toString();
      const providedStr = typeof amount === 'number' ? amount.toString() : amount;
      if (providedStr !== expectedStr) {
        throw new BadRequestException('Payment amount does not match group contribution amount');
      }
    }

    // idempotent transaction creation and marking payment atomically
    const result = await this.prisma.$transaction(async (tx) => {
      await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
      // Ensure payer wallet is provisioned (virtual account ready)
      const payerWallet = await tx.wallet.findUnique({ where: { id: payerWalletId }, select: { paystackProvisionStatus: true } as any });
      if (!payerWallet) throw new BadRequestException('Payer wallet not found');
      if (payerWallet.paystackProvisionStatus !== 'PROVISIONED') throw new BadRequestException('Payer wallet not provisioned with virtual account');
      // idempotency check for transaction reference
      const existingTx = await tx.transaction.findFirst({ where: { reference } });
      let txRecord: any = existingTx;

      if (!existingTx) {
        // Ensure group wallet exists (create if missing) and perform atomic double-entry: debit payer, credit group
        const groupId = payment.cycle?.group?.id;
        if (!groupId) throw new BadRequestException('Group not found for contribution cycle');

        let groupWallet = await tx.wallet.findUnique({ where: { groupId } });
        if (!groupWallet) {
          groupWallet = await (tx.wallet as any).create({ _internal: true, data: { groupId } });
        }

        // create double-entry (marks both DEBIT and CREDIT)
        const de: any = await (this.transactions as any).createDoubleEntry({
          fromWalletId: payerWalletId,
          toWalletId: groupWallet.id,
          amount: typeof amount === 'number' ? amount.toString() : amount,
          reference,
          status: 'SUCCESS',
          metadata: { cycleId, groupContributorId },
        }, tx as any);

        txRecord = de;
      }

      // mark payment as PAID
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
          metadata: { transaction: txRecord, reference, groupId: payment.cycle?.group?.id, cycleId: payment.cycleId },
        },
      });

      return { payment: updatedPayment, transaction: txRecord };
    });

    // Optionally, enqueue a notification
    try {
      const userId = payment?.groupContributor?.userId || null;
      if (userId) {
        await this.queue.addNotificationJob('send-notification', { userId, type: 'PAYMENT_SUCCESS', payload: { paymentId: result.payment.id, cycleId: result.payment.cycleId } });
      }
    } catch (err) {
      this.logger.warn('Failed to enqueue notification', err?.message || err);
    }

    this.logger.log(`Recorded payment ${result.payment.id} tx=${result.transaction?.id}`);
    // After recording, check if cycle is now complete and trigger payout atomically
    try {
      await this.checkCycleCompletion(result.payment.cycleId);
    } catch (err) {
      this.logger.warn('checkCycleCompletion failed', err?.message || err);
    }

    return result;
  }

  /**
   * Mark contribution cycle as completed and enqueue payout job.
   */
  async completeCycle(cycleId: string) {
    const cycle = await this.prisma.contributionCycle.findUnique({ where: { id: cycleId }, include: { payments: true, group: true } });
    if (!cycle) throw new BadRequestException('Cycle not found');

    if (cycle.status === 'COMPLETED') return cycle;

    // ensure all payments are PAID or handle partials as business requires
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

    // enqueue payout job with cycle details
    await this.queue.addPayoutJob('payout_cycle', { cycleId });

    this.logger.log(`Cycle ${cycleId} completed and payout enqueued`);
    return this.prisma.contributionCycle.findUnique({ where: { id: cycleId } });
  }

  /**
   * Admin override: mark a FAILED/UNPAID payment as PAID without moving funds.
   * Use when admin covers a defaulter outside the system.
   */
  async adminMarkPaymentPaid(paymentId: string, adminId: string, reason?: string) {
    const payment = await this.prisma.contributionPayment.findUnique({
      where: { id: paymentId },
      include: { cycle: { include: { group: true } } },
    });
    if (!payment) throw new BadRequestException('Payment not found');
    if (payment.status === 'PAID') return { ok: true, message: 'Already paid' };
    if (payment.cycle?.status === 'COMPLETED') throw new BadRequestException('Cycle already completed');

    await this.prisma.$transaction(async (tx) => {
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
          metadata: { reason: reason || 'Admin override', cycleId: payment.cycleId, groupId: payment.cycle?.group?.id },
        },
      });
    });

    // check if this completes the cycle
    try {
      await this.checkCycleCompletion(payment.cycleId);
    } catch (err) {
      this.logger.warn('checkCycleCompletion failed after admin override', err?.message || err);
    }

    return { ok: true };
  }

  /**
   * Enqueue a retry job for all FAILED payments in a cycle.
   */
  async enqueueRetryFailed(cycleId: string) {
    const cycle = await this.prisma.contributionCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new BadRequestException('Cycle not found');
    if (cycle.status === 'COMPLETED') throw new BadRequestException('Cycle already completed');

    const failedCount = await this.prisma.contributionPayment.count({ where: { cycleId, status: 'FAILED' } });
    if (failedCount === 0) throw new BadRequestException('No failed payments to retry');

    await this.queue.addPaymentJob('retry-failed-payments', { cycleId }, { jobId: `retry_failed_${cycleId}_${Date.now()}` });
    return { ok: true, failedCount };
  }

  /**
   * Admin waive: reverse a late fee that was charged on a payment.
   * Creates a reverse double-entry transaction (group wallet → user wallet).
   */
  async waiveLateFee(paymentId: string, adminId: string, reason?: string) {
    const payment = await this.prisma.contributionPayment.findUnique({
      where: { id: paymentId },
      include: { cycle: { include: { group: true } }, groupContributor: true },
    });
    if (!payment) throw new BadRequestException('Payment not found');

    const cycleId = payment.cycleId;
    const userId = payment.groupContributor.userId;
    const lateFee = Number((payment.cycle?.group as any)?.lateFee || 0);
    if (!lateFee || lateFee <= 0) throw new BadRequestException('No late fee configured for this group');

    // Check that a late fee was actually charged for this payment
    const originalRef = `late-fee:${cycleId}:${paymentId}`;
    const originalTx = await this.prisma.transaction.findFirst({ where: { reference: originalRef } });
    if (!originalTx) throw new BadRequestException('No late fee found for this payment');

    // Ensure not already reversed
    const reverseRef = `late-fee-waive:${cycleId}:${paymentId}`;
    const existingReverse = await this.prisma.transaction.findFirst({ where: { reference: reverseRef } });
    if (existingReverse) return { ok: true, message: 'Late fee already waived' };

    // Reverse: group wallet → user wallet
    const userWallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!userWallet) throw new BadRequestException('User wallet not found');

    const groupWallet = await this.prisma.wallet.findUnique({ where: { groupId: payment.cycle.groupId } });
    if (!groupWallet) throw new BadRequestException('Group wallet not found');

    await this.prisma.$transaction(async (tx) => {
      await this.transactions.createDoubleEntry({
        fromWalletId: groupWallet.id,
        toWalletId: userWallet.id,
        amount: lateFee.toString(),
        reference: reverseRef,
        status: 'SUCCESS',
        metadata: { cycleId, paymentId, reason: reason || 'Admin waive' },
      }, tx as any);

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'waive_late_fee',
          entityType: 'ContributionPayment',
          entityId: paymentId,
          metadata: { lateFee, cycleId, reason: reason || 'Admin waive', groupId: payment.cycle?.groupId },
        },
      });
    });

    return { ok: true };
  }
}
