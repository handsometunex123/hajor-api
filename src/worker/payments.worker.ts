import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '../infrastructure/monitoring/monitoring.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { TransactionsService } from '../modules/transactions/transactions.service';
import { Worker, Job, Queue } from 'bullmq';
import { getRedisConfig } from '../infrastructure/redis/redis.config';

const connection = getRedisConfig();

const prisma = new PrismaClient();
// Create PrismaService wrapper and other services used by TransactionsService
const prismaService = new PrismaService();
const configService = new ConfigService();
const monitoringService = new MonitoringService(configService);
const redisService = new RedisService(configService, monitoringService as any);
// initialize redis client
redisService.onModuleInit && redisService.onModuleInit();
// connect prisma
prismaService.$connect();
const transactionsService = new TransactionsService(prismaService as any, redisService as any);
const paymentsQueueName = 'payments';
const payoutsQueueName = 'payouts';
const notificationsQueueName = 'notifications';

// FraudService for auto-checking default rates on payment failures
import { FraudService } from '../modules/fraud/fraud.service';
const fraudService = new FraudService(prismaService as any);

async function processAutoDebit(job: Job) {
  const { cycleId } = job.data;
  if (!cycleId) throw new Error('Missing cycleId');

  console.log(`Auto-debit job started for cycle ${cycleId}`);

  // load cycle and unpaid payments
  const cycle = await prisma.contributionCycle.findUnique({ where: { id: cycleId }, include: { payments: { where: { status: 'UNPAID' }, include: { groupContributor: { include: { user: true } } } }, group: true } });
  if (!cycle) throw new Error('Cycle not found');

  const payments = cycle.payments;
  const results: any[] = [];

  for (const p of payments) {
    const paymentId = p.id;
    const amount = p.amount.toString();
    const userId = p.groupContributor.userId;

    // idempotency: skip if payment already PAID
    const fresh = await prisma.contributionPayment.findUnique({ where: { id: paymentId } });
    if (!fresh) continue;
    if (fresh.status === 'PAID') {
      results.push({ paymentId, status: 'skipped_already_paid' });
      continue;
    }

    const txRef = `auto-debit:${cycleId}:${paymentId}`;

    try {
      // compute wallet for user
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        // mark failed
        await prisma.contributionPayment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
        results.push({ paymentId, status: 'failed_no_wallet' });
        continue;
      }

      // Ensure wallet has provisioned virtual account
      if (wallet.paystackProvisionStatus !== 'PROVISIONED') {
        await prisma.contributionPayment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
        const notifications = new Queue(notificationsQueueName, { connection });
        await notifications.add('send-notification', { userId, type: 'WALLET_NOT_PROVISIONED', payload: { paymentId, cycleId } }, { removeOnComplete: true, attempts: 1 });
        results.push({ paymentId, status: 'failed_not_provisioned' });
        continue;
      }

      // compute balance (sum credits - sum debits)
      const credit = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId: wallet.id, type: 'CREDIT', status: 'SUCCESS' } });
      const debit = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId: wallet.id, type: 'DEBIT', status: 'SUCCESS' } });
      const creditSum = credit._sum.amount ? Number(credit._sum.amount.toString()) : 0;
      const debitSum = debit._sum.amount ? Number(debit._sum.amount.toString()) : 0;
      const balance = creditSum - debitSum;
      if (balance < Number(amount)) {
        await prisma.contributionPayment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
        // enqueue notification for failed debit
        const notifications = new Queue(notificationsQueueName, { connection });
        await notifications.add('send-notification', { userId, type: 'DEBIT_FAILED', payload: { paymentId, cycleId, amount } }, { removeOnComplete: true, attempts: 1 });
        results.push({ paymentId, status: 'failed_insufficient_funds' });
        continue;
      }

      // perform atomic double-entry: debit payer wallet and credit group wallet, then mark payment PAID
      await prismaService.$transaction(async (tx) => {
        await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
        // determine groupId from cycleId via contribution cycle lookup inside tx
        const cycleRow = await tx.contributionCycle.findUnique({ where: { id: cycleId }, select: { groupId: true } });
        const groupId = cycleRow?.groupId;
        if (!groupId) throw new Error('Group not found for cycle when creating group wallet');

        let groupWallet = await tx.wallet.findUnique({ where: { groupId } });
        if (!groupWallet) {
          groupWallet = await (tx.wallet as any).create({ _internal: true, data: { groupId } });
        }

        // idempotent double-entry creation inside same tx
        const de = await transactionsService.createDoubleEntry({ fromWalletId: wallet.id, toWalletId: groupWallet.id, amount: amount, reference: txRef, status: 'SUCCESS', metadata: { cycleId, paymentId } }, tx as any);

        const txIdForAudit = de && (de.debit || de.existing) ? (de.debit || de.existing) : null;

        // mark payment PAID if not already
        const currentPayment = await tx.contributionPayment.findUnique({ where: { id: paymentId } });
        if (currentPayment && currentPayment.status !== 'PAID') {
          await tx.contributionPayment.update({ where: { id: paymentId }, data: { status: 'PAID', paidAt: new Date() } });
        }

        await tx.auditLog.create({ data: { actorId: null, action: 'worker_auto_debit', entityType: 'ContributionPayment', entityId: paymentId, metadata: { txId: txIdForAudit, cycleId, groupId } } });
      });

      // enqueue payment success notification
      const notifications = new Queue(notificationsQueueName, { connection });
      await notifications.add('send-notification', { userId, type: 'PAYMENT_SUCCESS', payload: { paymentId, cycleId, amount } }, { removeOnComplete: true, attempts: 1 });

      results.push({ paymentId, status: 'paid' });
    } catch (err) {
      console.error('Auto-debit error for payment', paymentId, err);
      try {
        await prisma.contributionPayment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
      } catch (e) {}
      results.push({ paymentId, status: 'failed_error', error: err?.message || String(err) });
    }
  }

  // Auto-trigger fraud default-rate check for users with failed payments (non-blocking)
  const failedUserIds = new Set(
    results.filter((r) => r.status?.startsWith('failed')).map((r) => {
      const p = payments.find((pay) => pay.id === r.paymentId);
      return p?.groupContributor?.userId;
    }).filter(Boolean),
  );
  for (const uid of failedUserIds) {
    try {
      await fraudService.checkDefaultRate(uid as string);
    } catch (err) {
      console.warn('Fraud check failed for user', uid, err?.message || err);
    }
  }

  // after processing all payments, check cycle completion
  try {
    const paymentsAll = await prisma.contributionPayment.findMany({ where: { cycleId } });
    const allPaid = paymentsAll.length > 0 && paymentsAll.every((p) => p.status === 'PAID');
    if (allPaid) {
      await prisma.contributionCycle.update({ where: { id: cycleId }, data: { status: 'COMPLETED' } });
      // enqueue payout job delayed 24 hours after contributionDate
      const payouts = new Queue(payoutsQueueName, { connection });
      const contributionDate = cycle.contributionDate;
      const payoutDelay = Math.max(0, new Date(contributionDate).getTime() + 24 * 60 * 60 * 1000 - Date.now());
      await payouts.add('process-payout', { cycleId }, { delay: payoutDelay, jobId: cycleId, removeOnComplete: true });
    } else {
      // Schedule automatic retry for failed payments (1 hour delay)
      const failedCount = paymentsAll.filter((p) => p.status === 'FAILED').length;
      if (failedCount > 0) {
        const payments = new Queue(paymentsQueueName, { connection });
        await payments.add('retry-failed-payments', { cycleId }, {
          delay: 60 * 60 * 1000, // retry after 1 hour
          jobId: `auto_retry_${cycleId}_${Date.now()}`,
          removeOnComplete: true,
          attempts: 1,
        });
        console.log(`Scheduled automatic retry for ${failedCount} failed payment(s) in cycle ${cycleId}`);
      }
    }
  } catch (err) {
    console.error('Error checking cycle completion', err);
  }

  console.log(`Auto-debit job finished for cycle ${cycleId}`, results);
  return { results };
}

async function processRetryFailed(job: Job) {
  const { cycleId } = job.data;
  if (!cycleId) throw new Error('Missing cycleId');
  console.log(`Retry-failed-payments started for cycle ${cycleId}`);

  const failedPayments = await prisma.contributionPayment.findMany({ where: { cycleId, status: 'FAILED' }, include: { groupContributor: { include: { user: true } } } });
  for (const p of failedPayments) {
    // re-enqueue a small auto-debit for this specific payment by calling process logic inline
    try {
      // attempt similar debit flow for single payment
      const paymentId = p.id;
      const amount = p.amount.toString();
      const userId = p.groupContributor.userId;
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        continue;
      }
      if (wallet.paystackProvisionStatus !== 'PROVISIONED') {
        continue;
      }
      const credit = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId: wallet.id, type: 'CREDIT', status: 'SUCCESS' } });
      const debit = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId: wallet.id, type: 'DEBIT', status: 'SUCCESS' } });
      const creditSum = credit._sum.amount ? Number(credit._sum.amount.toString()) : 0;
      const debitSum = debit._sum.amount ? Number(debit._sum.amount.toString()) : 0;
      const balance = creditSum - debitSum;
      if (balance < Number(amount)) {
        continue;
      }

      const txRef = `auto-debit:${cycleId}:${paymentId}`;
      await prismaService.$transaction(async (tx) => {
        await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
        const cycleRow = await tx.contributionCycle.findUnique({ where: { id: cycleId }, select: { groupId: true } });
        const groupId = cycleRow?.groupId;
        if (!groupId) throw new Error('Group not found for cycle when creating group wallet');

        let groupWallet = await tx.wallet.findUnique({ where: { groupId } });
        if (!groupWallet) {
          groupWallet = await (tx.wallet as any).create({ _internal: true, data: { groupId } });
        }

        const de = await transactionsService.createDoubleEntry({ fromWalletId: wallet.id, toWalletId: groupWallet.id, amount: amount, reference: txRef, status: 'SUCCESS', metadata: { cycleId, paymentId } }, tx as any);
        const txIdForAudit = de && (de.debit || de.existing) ? (de.debit || de.existing) : null;

        const currentPayment = await tx.contributionPayment.findUnique({ where: { id: paymentId } });
        if (currentPayment && currentPayment.status !== 'PAID') {
          await tx.contributionPayment.update({ where: { id: paymentId }, data: { status: 'PAID', paidAt: new Date() } });
        }
        await tx.auditLog.create({ data: { actorId: null, action: 'worker_retry_debit', entityType: 'ContributionPayment', entityId: paymentId, metadata: { txId: txIdForAudit, cycleId, groupId } } });
      });
    } catch (err) {
      console.error('Retry debit failed for', p.id, err);
    }
  }

  // after retries, attempt to complete cycle
  try {
    const paymentsAll = await prisma.contributionPayment.findMany({ where: { cycleId } });
    const allPaid = paymentsAll.length > 0 && paymentsAll.every((p) => p.status === 'PAID');
    if (allPaid) {
      await prisma.contributionCycle.update({ where: { id: cycleId }, data: { status: 'COMPLETED' } });
      const payouts = new Queue(payoutsQueueName, { connection });
      const contributionDate = (await prisma.contributionCycle.findUnique({ where: { id: cycleId } })).contributionDate;
      const payoutDelay = Math.max(0, new Date(contributionDate).getTime() + 24 * 60 * 60 * 1000 - Date.now());
      await payouts.add('process-payout', { cycleId }, { delay: payoutDelay, jobId: cycleId, removeOnComplete: true });
    } else {
      // Notify users whose payments remain FAILED after retry
      const stillFailed = paymentsAll.filter((p) => p.status === 'FAILED');
      if (stillFailed.length > 0) {
        const notifications = new Queue(notificationsQueueName, { connection });
        for (const p of stillFailed) {
          try {
            const contrib = await prisma.groupContributor.findUnique({ where: { id: p.groupContributorId }, select: { userId: true } });
            if (contrib) {
              await notifications.add('send-notification', { userId: contrib.userId, type: 'PAYMENT_FAILED', payload: { paymentId: p.id, cycleId, amount: p.amount.toString() } }, { removeOnComplete: true });
            }
          } catch (_) {}
        }
        // Schedule first daily grace-period reminder (chains itself for each day of grace period)
        try {
          const graceQueue = new Queue(paymentsQueueName, { connection });
          await graceQueue.add('grace-period-reminder', { cycleId, dayNumber: 1 }, {
            delay: 24 * 60 * 60 * 1000,
            jobId: `grace_reminder_${cycleId}_day1`,
            removeOnComplete: true,
          });
        } catch (err) {
          console.warn('Failed to schedule grace-period-reminder', err?.message || err);
        }
      }
    }
  } catch (err) {
    console.error('Error checking cycle completion after retries', err);
  }

  console.log(`Retry-failed-payments finished for cycle ${cycleId}`);
  return { ok: true };
}

async function processGracePeriodReminder(job: Job) {
  const { cycleId, dayNumber } = job.data;
  if (!cycleId) throw new Error('Missing cycleId');
  console.log(`Grace-period-reminder day ${dayNumber} for cycle ${cycleId}`);

  const cycle = await prisma.contributionCycle.findUnique({
    where: { id: cycleId },
    include: { group: true, payments: { include: { groupContributor: { select: { userId: true } } } } },
  });

  if (!cycle || cycle.status !== 'COLLECTING') {
    console.log(`Grace-period-reminder skipped — cycle ${cycleId} not in COLLECTING status`);
    return { ok: true, reason: 'not_collecting' };
  }

  const gracePeriodDays = (cycle.group as any).gracePeriodDays ?? 1;
  const graceEndDate = new Date(cycle.contributionDate);
  graceEndDate.setUTCDate(graceEndDate.getUTCDate() + gracePeriodDays);

  const notifications = new Queue(notificationsQueueName, { connection });

  // Send reminders to FAILED/UNPAID contributors
  const outstanding = cycle.payments.filter((p) => p.status === 'FAILED' || p.status === 'UNPAID');
  for (const p of outstanding) {
    try {
      await notifications.add(
        'send-notification',
        { userId: p.groupContributor.userId, type: 'PAYMENT_REMINDER', payload: { cycleId, paymentId: p.id, dayNumber, graceEndDate } },
        { removeOnComplete: true },
      );
    } catch (_) {}
  }

  // If still within grace period, schedule next daily reminder
  const now = new Date();
  if (now < graceEndDate) {
    const paymentsQueue = new Queue(paymentsQueueName, { connection });
    await paymentsQueue.add(
      'grace-period-reminder',
      { cycleId, dayNumber: dayNumber + 1 },
      { delay: 24 * 60 * 60 * 1000, jobId: `grace_reminder_${cycleId}_day${dayNumber + 1}`, removeOnComplete: true },
    );
  }

  console.log(`Grace-period-reminder day ${dayNumber} sent ${outstanding.length} reminder(s) for cycle ${cycleId}`);
  return { ok: true, reminders: outstanding.length };
}

const worker = new Worker(paymentsQueueName, async (job: Job) => {
  console.log(`Payments worker processing job ${job.id} name=${job.name}`);
  if (job.name === 'auto-debit-cycle') return processAutoDebit(job);
  if (job.name === 'retry-failed-payments') return processRetryFailed(job);
  if (job.name === 'grace-period-reminder') return processGracePeriodReminder(job);
  console.log('Unknown payments job', job.name);
  return { ok: false };
}, { connection });

worker.on('completed', (job) => console.log(`Payments job ${job.id} (${job.name}) completed`));
worker.on('failed', (job, err) => console.error(`Payments job ${job?.id} (${job?.name}) failed: ${err?.message}`));

const shutdown = async () => {
  try {
    await worker.close();
  } catch (err) {
    console.error('Error closing worker', err);
  }
  try {
    await prisma.$disconnect();
  } catch (err) {}
  try {
    await prismaService.$disconnect();
  } catch (err) {}
  try {
    if (redisService && typeof redisService.onModuleDestroy === 'function') {
      await redisService.onModuleDestroy();
    }
  } catch (err) {}
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
