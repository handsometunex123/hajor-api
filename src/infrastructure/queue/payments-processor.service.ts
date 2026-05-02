import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../../modules/transactions/transactions.service';
import { FraudService } from '../../modules/fraud/fraud.service';

interface Queues {
  payments: Queue;
  payouts: Queue;
  notifications: Queue;
}

@Injectable()
export class PaymentsProcessorService {
  private readonly logger = new Logger(PaymentsProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionsService,
    private readonly fraud: FraudService,
  ) {}

  async process(job: Job, queues: Queues): Promise<any> {
    this.logger.log(`Processing payments job ${job.id} name=${job.name}`);
    if (job.name === 'auto-debit-cycle') return this.processAutoDebit(job, queues);
    if (job.name === 'retry-failed-payments') return this.processRetryFailed(job, queues);
    if (job.name === 'grace-period-reminder') return this.processGracePeriodReminder(job, queues);
    this.logger.warn(`Unknown payments job: ${job.name}`);
    return { ok: false };
  }

  private async processAutoDebit(job: Job, queues: Queues) {
    const { cycleId } = job.data;
    if (!cycleId) throw new Error('Missing cycleId');
    this.logger.log(`Auto-debit started for cycle ${cycleId}`);

    const cycle = await this.prisma.contributionCycle.findUnique({
      where: { id: cycleId },
      include: {
        payments: { include: { groupContributor: { include: { user: true } } } },
        group: true,
      },
    });
    if (!cycle) throw new Error('Cycle not found');

    // ── Initialise payment records if this is the first run for the cycle ──────
    // ContributionPayment rows are created lazily here so the worker is the sole
    // source of truth for cycle initialisation — no manual setup required.
    if (cycle.payments.length === 0) {
      const contributors = await this.prisma.groupContributor.findMany({ where: { groupId: cycle.groupId } });
      for (const contributor of contributors) {
        await this.prisma.contributionPayment.create({
          data: {
            cycleId,
            groupContributorId: contributor.id,
            amount: cycle.group.contributionAmount,
            status: 'UNPAID',
          },
        });
      }
      this.logger.log(`Auto-debit: created ${contributors.length} payment record(s) for cycle ${cycleId}`);
    }

    // ── Transition cycle to COLLECTING ──────────────────────────────────────────
    if (cycle.status === 'PENDING') {
      await this.prisma.contributionCycle.update({ where: { id: cycleId }, data: { status: 'COLLECTING' } });
    }

    // ── Re-fetch only the UNPAID payments to process ────────────────────────────
    const unpaidPayments = await this.prisma.contributionPayment.findMany({
      where: { cycleId, status: 'UNPAID' },
      include: { groupContributor: { include: { user: true } } },
    });

    const results: any[] = [];

    for (const p of unpaidPayments) {
      const paymentId = p.id;
      const amount = p.amount.toString();
      const userId = p.groupContributor.userId;

      const fresh = await this.prisma.contributionPayment.findUnique({ where: { id: paymentId } });
      if (!fresh || fresh.status === 'PAID') {
        results.push({ paymentId, status: 'skipped_already_paid' });
        continue;
      }

      const txRef = `auto-debit:${cycleId}:${paymentId}`;

      try {
        const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) {
          await this.prisma.contributionPayment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
          results.push({ paymentId, status: 'failed_no_wallet' });
          continue;
        }

        if (wallet.paystackProvisionStatus !== 'PROVISIONED') {
          await this.prisma.contributionPayment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
          await queues.notifications.add('send-notification', { userId, type: 'WALLET_NOT_PROVISIONED', payload: { paymentId, cycleId } }, { removeOnComplete: true, attempts: 1 });
          results.push({ paymentId, status: 'failed_not_provisioned' });
          continue;
        }

        const credit = await this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId: wallet.id, type: 'CREDIT', status: 'SUCCESS' } });
        const debit = await this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId: wallet.id, type: 'DEBIT', status: 'SUCCESS' } });
        const balance = (credit._sum.amount ? Number(credit._sum.amount.toString()) : 0)
                      - (debit._sum.amount ? Number(debit._sum.amount.toString()) : 0);

        if (balance < Number(amount)) {
          await this.prisma.contributionPayment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
          await queues.notifications.add('send-notification', { userId, type: 'DEBIT_FAILED', payload: { paymentId, cycleId, amount } }, { removeOnComplete: true, attempts: 1 });
          results.push({ paymentId, status: 'failed_insufficient_funds' });
          continue;
        }

        await this.prisma.$transaction(async (tx) => {
          const cycleRow = await tx.contributionCycle.findUnique({ where: { id: cycleId }, select: { groupId: true } });
          const groupId = cycleRow?.groupId;
          if (!groupId) throw new Error('Group not found for cycle');

          let groupWallet = await tx.wallet.findUnique({ where: { groupId } });
          if (!groupWallet) {
            await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
            groupWallet = await (tx.wallet as any).create({ _internal: true, data: { groupId } });
          }

          const de = await this.transactions.createDoubleEntry(
            { fromWalletId: wallet.id, toWalletId: groupWallet.id, amount, reference: txRef, status: 'SUCCESS', metadata: { cycleId, paymentId } },
            tx as any,
          );
          const txIdForAudit = de && (de.debit || de.existing) ? (de.debit || de.existing) : null;

          const current = await tx.contributionPayment.findUnique({ where: { id: paymentId } });
          if (current && current.status !== 'PAID') {
            await tx.contributionPayment.update({ where: { id: paymentId }, data: { status: 'PAID', paidAt: new Date() } });
          }
          await tx.auditLog.create({ data: { actorId: null, action: 'worker_auto_debit', entityType: 'ContributionPayment', entityId: paymentId, metadata: { txId: txIdForAudit, cycleId } } });
        });

        await queues.notifications.add('send-notification', { userId, type: 'PAYMENT_SUCCESS', payload: { paymentId, cycleId, amount } }, { removeOnComplete: true, attempts: 1 });
        results.push({ paymentId, status: 'paid' });
      } catch (err: any) {
        this.logger.error(`Auto-debit error for payment ${paymentId}: ${err?.message}`);
        try { await this.prisma.contributionPayment.update({ where: { id: paymentId }, data: { status: 'FAILED' } }); } catch (_) {}
        results.push({ paymentId, status: 'failed_error', error: err?.message });
      }
    }

    // Fraud check on failed users (non-blocking)
    const failedUserIds = new Set(
      results
        .filter((r) => r.status?.startsWith('failed'))
        .map((r) => unpaidPayments.find((p) => p.id === r.paymentId)?.groupContributor?.userId)
        .filter(Boolean),
    );
    for (const uid of failedUserIds) {
      try { await this.fraud.checkDefaultRate(uid as string); } catch (_) {}
    }

    await this.checkCycleCompletion(cycleId, cycle.contributionDate, queues);
    this.logger.log(`Auto-debit finished for cycle ${cycleId}`);
    return { results };
  }

  private async processRetryFailed(job: Job, queues: Queues) {
    const { cycleId } = job.data;
    if (!cycleId) throw new Error('Missing cycleId');
    this.logger.log(`Retry-failed-payments started for cycle ${cycleId}`);

    const failedPayments = await this.prisma.contributionPayment.findMany({
      where: { cycleId, status: 'FAILED' },
      include: { groupContributor: { include: { user: true } } },
    });

    for (const p of failedPayments) {
      try {
        const paymentId = p.id;
        const amount = p.amount.toString();
        const userId = p.groupContributor.userId;
        const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
        if (!wallet || wallet.paystackProvisionStatus !== 'PROVISIONED') continue;

        const credit = await this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId: wallet.id, type: 'CREDIT', status: 'SUCCESS' } });
        const debit = await this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId: wallet.id, type: 'DEBIT', status: 'SUCCESS' } });
        const balance = (credit._sum.amount ? Number(credit._sum.amount.toString()) : 0)
                      - (debit._sum.amount ? Number(debit._sum.amount.toString()) : 0);
        if (balance < Number(amount)) continue;

        const txRef = `auto-debit:${cycleId}:${paymentId}`;
        await this.prisma.$transaction(async (tx) => {
          const cycleRow = await tx.contributionCycle.findUnique({ where: { id: cycleId }, select: { groupId: true } });
          const groupId = cycleRow?.groupId;
          if (!groupId) throw new Error('Group not found for cycle');

          let groupWallet = await tx.wallet.findUnique({ where: { groupId } });
          if (!groupWallet) {
            await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
            groupWallet = await (tx.wallet as any).create({ _internal: true, data: { groupId } });
          }

          const de = await this.transactions.createDoubleEntry(
            { fromWalletId: wallet.id, toWalletId: groupWallet.id, amount, reference: txRef, status: 'SUCCESS', metadata: { cycleId, paymentId } },
            tx as any,
          );
          const txIdForAudit = de && (de.debit || de.existing) ? (de.debit || de.existing) : null;

          const current = await tx.contributionPayment.findUnique({ where: { id: paymentId } });
          if (current && current.status !== 'PAID') {
            await tx.contributionPayment.update({ where: { id: paymentId }, data: { status: 'PAID', paidAt: new Date() } });
          }
          await tx.auditLog.create({ data: { actorId: null, action: 'worker_retry_debit', entityType: 'ContributionPayment', entityId: paymentId, metadata: { txId: txIdForAudit, cycleId } } });
        });
      } catch (err: any) {
        this.logger.error(`Retry debit failed for ${p.id}: ${err?.message}`);
      }
    }

    const paymentsAll = await this.prisma.contributionPayment.findMany({ where: { cycleId } });
    const allPaid = paymentsAll.length > 0 && paymentsAll.every((p) => p.status === 'PAID');
    if (allPaid) {
      const cycle = await this.prisma.contributionCycle.findUnique({ where: { id: cycleId } });
      await this.prisma.contributionCycle.update({ where: { id: cycleId }, data: { status: 'COMPLETED' } });
      const payoutDelay = Math.max(0, new Date(cycle.contributionDate).getTime() + 24 * 60 * 60 * 1000 - Date.now());
      await queues.payouts.add('process-payout', { cycleId }, { delay: payoutDelay, jobId: cycleId, removeOnComplete: true });
    } else {
      const stillFailed = paymentsAll.filter((p) => p.status === 'FAILED');
      for (const p of stillFailed) {
        try {
          const contrib = await this.prisma.groupContributor.findUnique({ where: { id: p.groupContributorId }, select: { userId: true } });
          if (contrib) {
            await queues.notifications.add('send-notification', { userId: contrib.userId, type: 'PAYMENT_FAILED', payload: { paymentId: p.id, cycleId, amount: p.amount.toString() } }, { removeOnComplete: true });
          }
        } catch (_) {}
      }
      if (stillFailed.length > 0) {
        await queues.payments.add('grace-period-reminder', { cycleId, dayNumber: 1 }, {
          delay: 24 * 60 * 60 * 1000,
          jobId: `grace_reminder_${cycleId}_day1`,
          removeOnComplete: true,
        });
      }
    }

    this.logger.log(`Retry-failed-payments finished for cycle ${cycleId}`);
    return { ok: true };
  }

  private async processGracePeriodReminder(job: Job, queues: Queues) {
    const { cycleId, dayNumber } = job.data;
    if (!cycleId) throw new Error('Missing cycleId');
    this.logger.log(`Grace-period-reminder day ${dayNumber} for cycle ${cycleId}`);

    const cycle = await this.prisma.contributionCycle.findUnique({
      where: { id: cycleId },
      include: { group: true, payments: { include: { groupContributor: { select: { userId: true } } } } },
    });

    if (!cycle || cycle.status !== 'COLLECTING') {
      return { ok: true, reason: 'not_collecting' };
    }

    const gracePeriodDays = (cycle.group as any).gracePeriodDays ?? 1;
    const graceEndDate = new Date(cycle.contributionDate);
    graceEndDate.setUTCDate(graceEndDate.getUTCDate() + gracePeriodDays);

    const outstanding = cycle.payments.filter((p) => p.status === 'FAILED' || p.status === 'UNPAID');
    for (const p of outstanding) {
      try {
        await queues.notifications.add('send-notification', { userId: p.groupContributor.userId, type: 'PAYMENT_REMINDER', payload: { cycleId, paymentId: p.id, dayNumber, graceEndDate } }, { removeOnComplete: true });
      } catch (_) {}
    }

    if (new Date() < graceEndDate) {
      await queues.payments.add('grace-period-reminder', { cycleId, dayNumber: dayNumber + 1 }, {
        delay: 24 * 60 * 60 * 1000,
        jobId: `grace_reminder_${cycleId}_day${dayNumber + 1}`,
        removeOnComplete: true,
      });
    }

    return { ok: true, reminders: outstanding.length };
  }

  private async checkCycleCompletion(cycleId: string, contributionDate: Date, queues: Queues) {
    try {
      const paymentsAll = await this.prisma.contributionPayment.findMany({ where: { cycleId } });
      const allPaid = paymentsAll.length > 0 && paymentsAll.every((p) => p.status === 'PAID');
      if (allPaid) {
        await this.prisma.contributionCycle.update({ where: { id: cycleId }, data: { status: 'COMPLETED' } });
        const payoutDelay = Math.max(0, new Date(contributionDate).getTime() + 24 * 60 * 60 * 1000 - Date.now());
        await queues.payouts.add('process-payout', { cycleId }, { delay: payoutDelay, jobId: cycleId, removeOnComplete: true });
      } else {
        const failedCount = paymentsAll.filter((p) => p.status === 'FAILED').length;
        if (failedCount > 0) {
          await queues.payments.add('retry-failed-payments', { cycleId }, {
            delay: 60 * 60 * 1000,
            jobId: `auto_retry_${cycleId}_${Date.now()}`,
            removeOnComplete: true,
            attempts: 1,
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`Error checking cycle completion: ${err?.message}`);
    }
  }
}
