import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { sendAlert } from '../infrastructure/monitoring/alert';
import { Worker, Job } from 'bullmq';
import { getRedisConfig } from '../infrastructure/redis/redis.config';

const connection = getRedisConfig();

const prisma = new PrismaClient();

async function reconcilePaystack() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const base = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY not configured');

  const summary = { checked: 0, missing: 0, mismatched: 0, autoFixed: 0 };

  try {
    const res = await axios.get(`${base}/transaction`, { headers: { Authorization: `Bearer ${secret}` } });
    const data = res.data;
    const providerTxs = (data?.data || []) as any[];
    for (const p of providerTxs) {
      summary.checked++;
      const providerRef = p.reference || p.id;
      const amount = p.amount ? p.amount / 100 : null;
      let tx = await prisma.transaction.findFirst({ where: { reference: { contains: providerRef } } });
      if (!tx) {
        try {
          tx = await prisma.transaction.findFirst({ where: { metadata: { path: ['providerReference'], equals: providerRef } } as any });
        } catch (_) {}
      }

      if (!tx) {
        summary.missing++;
        await prisma.auditLog.create({ data: { actorId: null, action: 'reconcile_missing_tx', entityType: 'ExternalTransaction', entityId: providerRef, metadata: { provider: 'paystack', providerPayload: p } } });
        try {
          await sendAlert('reconcile_missing_tx', { provider: 'paystack', providerRef, providerPayload: p });
        } catch (alertErr) { console.warn('Alert send failed for reconcile_missing_tx', alertErr?.message); }
      } else {
        const internalAmount = Number(tx.amount.toString());
        if (amount != null && Math.abs(internalAmount - amount) > 0.01) {
          summary.mismatched++;
          // Auto-fix: update internal amount to match provider if the transaction is still PENDING
          if (tx.status === 'PENDING') {
            await prisma.$transaction(async (client) => {
              await (client as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
              await client.transaction.update({ where: { id: tx.id }, data: { amount: amount } });
            });
            summary.autoFixed++;
            await prisma.auditLog.create({ data: { actorId: null, action: 'reconcile_auto_fix', entityType: 'Transaction', entityId: tx.id, metadata: { provider: 'paystack', providerRef, providerAmount: amount, oldAmount: internalAmount } } });
          } else {
            await prisma.auditLog.create({ data: { actorId: null, action: 'reconcile_amount_mismatch', entityType: 'Transaction', entityId: tx.id, metadata: { provider: 'paystack', providerRef, providerAmount: amount, internalAmount } } });
          }
          try {
            await sendAlert('reconcile_amount_mismatch', { provider: 'paystack', providerRef, providerAmount: amount, internalAmount, txId: tx.id, autoFixed: tx.status === 'PENDING' });
          } catch (alertErr) { console.warn('Alert send failed for reconcile_amount_mismatch', alertErr?.message); }
        }
      }
    }

    console.log('Reconciliation pass complete', summary);

    // Send summary alert if any issues found
    if (summary.missing > 0 || summary.mismatched > 0) {
      try {
        await sendAlert('reconciliation_summary', summary);
      } catch (alertErr) { console.warn('Alert send failed for reconciliation_summary', alertErr?.message); }
    }

    return summary;
  } catch (err) {
    console.error('Reconciliation failed', err?.message || err);
    try {
      await sendAlert('reconciliation_failed', { error: err?.message || String(err) });
    } catch (alertErr) { console.warn('Alert send failed for reconciliation_failed', alertErr?.message); }
    throw err;
  }
}

// BullMQ worker for scheduled / on-demand reconciliation
const worker = new Worker('reconciliation', async (job: Job) => {
  console.log(`Reconciliation worker processing job ${job.id}`);
  return reconcilePaystack();
}, { connection });

worker.on('completed', (job) => console.log(`Reconciliation job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`Reconciliation job ${job?.id} failed: ${err?.message}`));

if (require.main === module) {
  reconcilePaystack()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default reconcilePaystack;
