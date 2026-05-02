import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '../infrastructure/monitoring/monitoring.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { TransactionsService } from '../modules/transactions/transactions.service';
import { Worker, Job, Queue } from 'bullmq';

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisDb = parseInt(process.env.REDIS_DB || '0', 10);

const connection = { host: redisHost, port: redisPort, db: redisDb };

const prisma = new PrismaClient();
const prismaService = new PrismaService();
const configService = new ConfigService();
const monitoringService = new MonitoringService(configService);
const redisService = new RedisService(configService, monitoringService as any);
if (redisService.onModuleInit) redisService.onModuleInit();
prismaService.$connect();
const transactionsService = new TransactionsService(prismaService as any, redisService as any);

async function processPayout(job: Job) {
  const { cycleId } = job.data;
  if (!cycleId) throw new Error('Missing cycleId');

  console.log(`Payout job started for cycle ${cycleId}`);

  // load cycle and payments
  const cycle = await prisma.contributionCycle.findUnique({ where: { id: cycleId }, include: { payments: true, group: true } });
  if (!cycle) throw new Error('Cycle not found');

  // eligibility checks
  if (cycle.status !== 'COMPLETED') {
    throw new Error('Cycle not completed; cannot execute payout');
  }

  const payments = await prisma.contributionPayment.findMany({ where: { cycleId } });
  if (!payments || payments.length === 0) throw new Error('No payments found for cycle');

  // Allow payout if all payments are PAID, or a mix of PAID and DEFAULTED
  const nonFinalised = payments.filter((p) => p.status !== 'PAID' && p.status !== 'DEFAULTED');
  if (nonFinalised.length > 0) {
    throw new Error('Some payments are still UNPAID/FAILED; cannot execute payout');
  }

  const paidPayments = payments.filter((p) => p.status === 'PAID');
  if (paidPayments.length === 0) throw new Error('No paid payments found; aborting payout');

  // determine recipient by payoutOrder == cycleNumber
  const recipientContributor = await prisma.groupContributor.findFirst({ where: { groupId: cycle.groupId, payoutOrder: cycle.cycleNumber } });
  if (!recipientContributor) throw new Error('Recipient contributor not found for payoutOrder');

  // verify recipient KYC before executing payout
  const recipientUser = await prisma.user.findUnique({ where: { id: recipientContributor.userId } });
  if (!recipientUser?.bvnVerified) {
    throw new Error(`Recipient ${recipientContributor.userId} is not KYC-verified; cannot execute payout`);
  }

  // compute total payout from PAID payments only
  const total = paidPayments.reduce((acc, p) => acc + Number(p.amount.toString()), 0);

  // compute service charge deduction
  const serviceCharge = cycle.group.serviceCharge ? Number(cycle.group.serviceCharge.toString()) : 0;
  const netPayout = total - serviceCharge;
  if (netPayout <= 0) throw new Error('Net payout is zero or negative after service charge deduction');

  // find recipient wallet
  const recipientWallet = await prisma.wallet.findUnique({ where: { userId: recipientContributor.userId } });
  if (!recipientWallet) throw new Error('Recipient wallet not found');

  // idempotency: deterministic reference
  const reference = `payout:${cycleId}`;
  const existing = await transactionsService.getByReference(reference);
  if (existing) {
    console.log(`Payout already executed for cycle ${cycleId}, tx=${existing.id}`);
    return { skipped: true, txId: existing.id };
  }
  // perform atomic payout: debit group wallet and credit recipient wallet via double-entry
  const result = await prisma.$transaction(async (tx) => {
    await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
    // ensure group wallet exists
    let groupWallet = await tx.wallet.findUnique({ where: { groupId: cycle.groupId } });
    if (!groupWallet) {
      groupWallet = await (tx.wallet as any).create({ _internal: true, data: { groupId: cycle.groupId } });
    }

    // credit recipient with net payout (total minus service charge)
    const de = await transactionsService.createDoubleEntry({ fromWalletId: groupWallet.id, toWalletId: recipientWallet.id, amount: netPayout.toString(), reference, status: 'SUCCESS', metadata: { cycleId, recipientMemberId: recipientContributor.id, grossAmount: total, serviceCharge } }, tx as any);

    const payoutTxId = de && (de.credit || de.existing) ? (de.credit || de.existing) : null;

    // if service charge > 0, transfer it to admin wallet
    if (serviceCharge > 0) {
      const adminWallet = await tx.wallet.findUnique({ where: { userId: cycle.group.adminId } });
      if (adminWallet) {
        const chargeRef = `service-charge:${cycleId}`;
        await transactionsService.createDoubleEntry({ fromWalletId: groupWallet.id, toWalletId: adminWallet.id, amount: serviceCharge.toString(), reference: chargeRef, status: 'SUCCESS', metadata: { cycleId, type: 'service_charge' } }, tx as any);
      }
    }

    await tx.auditLog.create({
      data: {
        actorId: null,
        action: 'worker_execute_payout',
        entityType: 'Payout',
        entityId: payoutTxId,
        metadata: { cycleId, recipientMemberId: recipientContributor.id, grossAmount: total, serviceCharge, netPayout },
      },
    });

    // optional: mark cycle as paid by creating an audit entry; schema has no PAID_OUT enum value
    await tx.auditLog.create({
      data: {
        actorId: null,
        action: 'payout_marked',
        entityType: 'ContributionCycle',
        entityId: cycleId,
        metadata: { reference, txId: payoutTxId },
      },
    });

    return { payoutTxId };
  });

  console.log(`Payout executed for cycle ${cycleId} tx=${result.payoutTxId}`);

  // enqueue notification to recipient
  try {
    const notifications = new Queue('notifications', { connection });
    await notifications.add('send-notification', { userId: recipientContributor.userId, type: 'PAYOUT_SUCCESS', payload: { cycleId, txId: result.payoutTxId, amount: netPayout, serviceCharge } }, { removeOnComplete: true, attempts: 3 });
  } catch (err) {
    console.warn('Failed to enqueue payout notification', err?.message || err);
  }

  // Check if all cycles for this group are COMPLETED → mark group COMPLETED
  try {
    const allCycles = await prisma.contributionCycle.findMany({ where: { groupId: cycle.groupId } });
    const allDone = allCycles.every((c) => c.status === 'COMPLETED');
    if (allDone) {
      const freshGroup = await prisma.group.findUnique({ where: { id: cycle.groupId } });
      if (freshGroup && freshGroup.status !== 'COMPLETED' && freshGroup.status !== 'ARCHIVED') {
        await prisma.group.update({ where: { id: cycle.groupId }, data: { status: 'COMPLETED' } });
        console.log(`Group ${cycle.groupId} marked COMPLETED — all cycles done`);
        // Notify all contributors
        const contributors = await prisma.groupContributor.findMany({ where: { groupId: cycle.groupId } });
        const notifications = new Queue('notifications', { connection });
        for (const c of contributors) {
          await notifications.add('send-notification', { userId: c.userId, type: 'GROUP_COMPLETED', payload: { groupId: cycle.groupId } }, { removeOnComplete: true, attempts: 3 }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('Failed to check group completion', err?.message || err);
  }

  return { ok: true, txId: result.payoutTxId };
}

const worker = new Worker('payouts', async (job: Job) => {
  console.log(`Payouts worker processing job ${job.id} name=${job.name}`);
  try {
    const res = await processPayout(job);
    return res;
  } catch (err) {
    console.error('Payout worker error', err?.message || err);
    throw err;
  }
}, { connection });

worker.on('completed', (job) => console.log(`Payout job ${job.id} (${job.name}) completed`));
worker.on('failed', (job, err) => console.error(`Payout job ${job?.id} (${job?.name}) failed: ${err?.message}`));

const shutdown = async () => {
  try { await worker.close(); } catch (err) { console.error('Error closing payout worker', err); }
  try { await prisma.$disconnect(); } catch (err) {}
  try { await prismaService.$disconnect(); } catch (err) {}
  try { if (redisService && typeof redisService.onModuleDestroy === 'function') await redisService.onModuleDestroy(); } catch (err) {}
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
