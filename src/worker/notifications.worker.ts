import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { Worker, Job, Queue } from 'bullmq';
import { getRedisConfig } from '../infrastructure/redis/redis.config';

const prisma = new PrismaClient();
const connection = getRedisConfig();

async function processNotification(job: Job) {
  const { userId, type, payload } = job.data;
  if (!userId || !type) throw new Error('Invalid notification payload');

  // Load user and prefer email/phone
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found for notification');

  // Handle OTP send specially
  if (job.name === 'send-otp') {
    const otp = payload?.otp;
    if (!otp) throw new Error('Missing otp in payload');
    const destination = user.email || user.phone || null;
    if (!destination) throw new Error('No destination available for OTP');

    // Mask OTP in logs
    const masked = `***${String(otp).slice(-2)}`;
    console.log(`Send OTP to ${destination} user=${userId} otp=${masked}`);

    // TODO: integrate with real email/SMS provider here (SendGrid, Twilio, etc.)

    // record audit log for OTP send (store masked OTP only)
    await prisma.auditLog.create({ data: { actorId: null, action: 'send_otp', entityType: 'User', entityId: userId, metadata: { destination: destination, maskedOtp: masked } } });

    return { ok: true };
  }
  // send-invite-email job: send registration email with tokenized link
  if (job.name === 'send-invite-email') {
    const { email, name, token, inviteId } = job.data;
    const frontend = process.env.FRONTEND_URL || 'https://app.example.com';
    const url = `${frontend.replace(/\/+$/, '')}/register?inviteId=${encodeURIComponent(inviteId)}&token=${encodeURIComponent(token)}`;

    // Try SendGrid if configured, else fallback to console log
    if (process.env.SENDGRID_API_KEY) {
      try {
        const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }], subject: `You've been invited to join ${name}` }],
            from: { email: process.env.EMAIL_FROM || 'no-reply@example.com' },
            content: [{ type: 'text/html', value: `<p>Hello,</p><p>You have been invited to join a group. Click the link to register:</p><p><a href="${url}">Complete registration</a></p><p>This link expires in 7 days.</p>` }],
          }),
        });
        if (!resp.ok) throw new Error(`SendGrid responded ${resp.status}`);
        await prisma.auditLog.create({ data: { actorId: null, action: 'send_invite_email', entityType: 'Invitation', entityId: inviteId, metadata: { email } } });
        return { ok: true };
      } catch (err) {
        console.error('SendGrid send failed', err?.message || err);
      }
    }

    // Fallback: log and record audit
    console.log(`Invite email to ${email} link=${url}`);
    await prisma.auditLog.create({ data: { actorId: null, action: 'send_invite_email_fallback', entityType: 'Invitation', entityId: inviteId, metadata: { email } } });
    return { ok: true };
  }

  // provision-virtual-account job: create Paystack virtual account and persist to Wallet
  if (job.name === 'provision-virtual-account') {
    const { walletId, name, email } = job.data as any;
    if (!walletId) throw new Error('Missing walletId for provision-virtual-account');

    // ── DEV MOCK ─────────────────────────────────────────────────────────────
    // In non-production environments bypass Paystack entirely and immediately
    // mark the wallet as PROVISIONED with realistic-looking dummy data.
    if (process.env.NODE_ENV !== 'production') {
      const fakeAccountNumber = String(Math.floor(1000000000 + Math.random() * 9000000000));
      const fakeBanks = ['Wema Bank', 'Sterling Bank', 'Providus Bank', 'Titan Trust Bank'];
      const fakeBank = fakeBanks[Math.floor(Math.random() * fakeBanks.length)];
      const fakeVaId = `dev_va_${Date.now()}`;
      await prisma.$transaction(async (tx) => {
        await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
        await (tx.wallet as any).update({
          where: { id: walletId },
          data: {
            paystackVirtualAccountId: fakeVaId,
            paystackAccountNumber: fakeAccountNumber,
            paystackBank: fakeBank,
            paystackMeta: { dev: true, account_number: fakeAccountNumber, bank: fakeBank },
            paystackProvisionStatus: 'PROVISIONED',
            paystackProvisionedAt: new Date(),
          } as any,
        } as any);
      });
      await prisma.auditLog.create({
        data: {
          actorId: null,
          action: 'provision_va',
          entityType: 'Wallet',
          entityId: walletId,
          metadata: { provider: 'dev-mock', account_number: fakeAccountNumber, bank: fakeBank },
        },
      });
      console.log(`[DEV] Wallet ${walletId} provisioned with mock VA: ${fakeAccountNumber} (${fakeBank})`);
      return { ok: true, dev: true };
    }
    // ── END DEV MOCK ──────────────────────────────────────────────────────────

    const base = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      console.warn('PAYSTACK_SECRET_KEY not configured; skipping VA provisioning');
      return { ok: false };
    }
    // mark provisioning started and increment attempt counter
    try {
      await prisma.$transaction(async (tx) => {
        await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
        await (tx.wallet as any).update({ where: { id: walletId }, data: { paystackProvisionStatus: 'PROVISIONING', paystackProvisionAttempts: { increment: 1 } as any } as any });
      });
    } catch (err) {
      console.warn('Failed to mark wallet provisioning start', err?.message || err);
    }

    const endpoints = ['/dedicated_account', '/bank/virtual_account', '/virtual-account'];
    let success = false;
    let extracted: any = null;
    for (const path of endpoints) {
      try {
        const resp = await fetch(`${base.replace(/\/$/, '')}${path}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name || email, customer: email }),
        });
        if (!resp.ok) {
          // try next
          continue;
        }
        const bodyJson: any = await resp.json();
        const data = bodyJson?.data || bodyJson;
        // attempt to extract fields commonly returned
        const vaId = data?.id || data?.virtual_account_id || data?.account_id || null;
        const accountNumber = data?.account_number || data?.virtual_account_number || data?.accountNo || null;
        const bank = data?.bank || data?.bank_name || data?.account_bank || null;

        extracted = { vaId, accountNumber, bank, data };
        // persist fields and mark provisioned
        await prisma.$transaction(async (tx) => {
          await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
          await (tx.wallet as any).update({ where: { id: walletId }, data: { paystackVirtualAccountId: vaId, paystackAccountNumber: accountNumber, paystackBank: bank, paystackMeta: data, paystackProvisionStatus: 'PROVISIONED', paystackProvisionedAt: new Date() } as any });
        });
        await prisma.auditLog.create({ data: { actorId: null, action: 'provision_va', entityType: 'Wallet', entityId: walletId, metadata: { provider: 'paystack', data: data } } });
        success = true;
        break;
      } catch (err) {
        console.error('VA provisioning attempt failed for path', path, err?.message || err);
      }
    }

    if (!success) {
      try {
        // if this was last attempt, mark failed
        const maxAttempts = job.opts?.attempts || 1;
        if ((job.attemptsMade || 0) + 1 >= maxAttempts) {
          await prisma.$transaction(async (tx) => {
            await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
            await (tx.wallet as any).update({ where: { id: walletId }, data: { paystackProvisionStatus: 'FAILED' } as any });
          });
        }
        await prisma.auditLog.create({ data: { actorId: null, action: 'provision_va_failed', entityType: 'Wallet', entityId: walletId, metadata: {} } });
      } catch (err) {
        console.warn('Failed to mark provisioning failure', err?.message || err);
      }
      return { ok: false };
    }

    return { ok: true, data: extracted };
  }

  // expire-invitations job: mark expired PENDING invitations as REJECTED
  if (job.name === 'expire-invitations') {
    const now = new Date();
    const expired = await prisma.invitation.findMany({
      where: { status: 'PENDING', expiresAt: { lt: now } },
      select: { id: true, groupId: true, userId: true },
    });
    if (expired.length > 0) {
      await prisma.invitation.updateMany({
        where: { id: { in: expired.map((i) => i.id) } },
        data: { status: 'REJECTED' },
      });
      await prisma.auditLog.create({
        data: { actorId: null, action: 'invitations_expired', entityType: 'Invitation', entityId: expired[0].id, metadata: { count: expired.length, ids: expired.map((i) => i.id) } },
      });
    }
    console.log(`Expired ${expired.length} invitations`);
    return { ok: true, count: expired.length };
  }

  // cycle-timeout-sweep job: mark overdue COLLECTING cycles as completed with defaults
  if (job.name === 'cycle-timeout-sweep') {
    // Load all COLLECTING cycles with their group's gracePeriodDays for per-group cutoff
    const allCollecting = await prisma.contributionCycle.findMany({
      where: { status: 'COLLECTING' },
      include: { payments: true, group: true },
    });

    const now = new Date();
    // Only sweep cycles whose grace period has actually expired based on their group setting
    const stuckCycles = allCollecting.filter((cycle) => {
      const gracePeriodDays = (cycle.group as any).gracePeriodDays ?? 1;
      const graceEndDate = new Date(cycle.contributionDate);
      graceEndDate.setUTCDate(graceEndDate.getUTCDate() + gracePeriodDays);
      return now >= graceEndDate;
    });

    const payoutsQueue = new Queue('payouts', { connection });
    const notificationsQueue = new Queue('notifications', { connection });
    let defaultedCount = 0;

    for (const cycle of stuckCycles) {
      // Mark remaining UNPAID/FAILED payments as DEFAULTED
      const nonPaid = cycle.payments.filter((p) => p.status !== 'PAID');
      if (nonPaid.length > 0) {
        await prisma.contributionPayment.updateMany({
          where: { id: { in: nonPaid.map((p) => p.id) }, status: { in: ['UNPAID', 'FAILED'] } },
          data: { status: 'DEFAULTED' },
        });
        defaultedCount += nonPaid.length;
      }

      // Complete the cycle
      await prisma.contributionCycle.update({
        where: { id: cycle.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      await prisma.auditLog.create({
        data: { actorId: null, action: 'cycle_timeout_completed', entityType: 'ContributionCycle', entityId: cycle.id, metadata: { defaultedPayments: nonPaid.length, gracePeriodDays: (cycle.group as any).gracePeriodDays ?? 1 } },
      });

      // Enqueue payout job (proceeds with PAID payments only)
      await payoutsQueue.add('process-payout', { cycleId: cycle.id }, { jobId: cycle.id, removeOnComplete: true });

      // Notify defaulted users
      for (const p of nonPaid) {
        try {
          const contributor = await prisma.groupContributor.findUnique({ where: { id: p.groupContributorId }, select: { userId: true } });
          if (contributor) {
            await notificationsQueue.add('send-notification', { userId: contributor.userId, type: 'PAYMENT_DEFAULTED', payload: { cycleId: cycle.id, paymentId: p.id } }, { removeOnComplete: true });
          }
        } catch (_) {}
      }
    }

    console.log(`Cycle timeout sweep: ${stuckCycles.length} cycles completed, ${defaultedCount} payments defaulted`);
    return { ok: true, cycles: stuckCycles.length, defaulted: defaultedCount };
  }

  // reconcile-paystack job: poll Paystack for pending transactions and reconcile
  if (job.name === 'reconcile-paystack') {
    const base = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      console.warn('PAYSTACK_SECRET_KEY not configured; skipping reconciliation');
      return { ok: false };
    }

    const pending = await prisma.transaction.findMany({ where: { status: 'PENDING' }, take: 200, orderBy: { createdAt: 'desc' } });
    for (const tx of pending) {
      try {
        const m = tx.reference.match(/\|ref:(.+)$/);
        const ref = m ? m[1] : tx.reference;
        if (!ref) continue;
        try {
          const resp = await fetch(`${base.replace(/\/$/, '')}/transaction/verify/${encodeURIComponent(ref)}`, { headers: { Authorization: `Bearer ${secret}` } });
          if (!resp.ok) continue;
          const bodyJson: any = await resp.json();
          const status = bodyJson?.data?.status || bodyJson?.data?.transaction?.status || null;
          if (status && /success/i.test(status)) {
            await prisma.$transaction(async (client) => {
              await (client as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
              await client.transaction.update({ where: { id: tx.id }, data: { status: 'SUCCESS' } });
            });
            await prisma.auditLog.create({ data: { actorId: null, action: 'reconcile_deposit_success', entityType: 'Transaction', entityId: tx.id, metadata: { ref } } });
          } else if (status && /failed|error/i.test(status)) {
            await prisma.$transaction(async (client) => {
              await (client as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
              await client.transaction.update({ where: { id: tx.id }, data: { status: 'FAILED' } });
            });
            await prisma.auditLog.create({ data: { actorId: null, action: 'reconcile_deposit_failed', entityType: 'Transaction', entityId: tx.id, metadata: { ref } } });
          }
        } catch (err) {
          console.warn('Failed to fetch transaction from Paystack', err?.message || err);
        }
      } catch (err) {
        console.warn('Error reconciling tx', err?.message || err);
      }
    }
    return { ok: true, checked: pending.length };
  }

  // Generic notification fallback
  console.log(`Notify ${user.email || user.phone} user=${userId} type=${type} payload=${JSON.stringify(payload)}`);

  // record audit log for notification
  await prisma.auditLog.create({ data: { actorId: null, action: 'send_notification', entityType: 'User', entityId: userId, metadata: { type, payload } } });

  return { ok: true };
}

const worker = new Worker('notifications', async (job: Job) => {
  console.log(`Notifications worker processing job ${job.id} name=${job.name}`);
  return processNotification(job);
}, { connection });

worker.on('completed', (job) => console.log(`Notification job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`Notification job ${job?.id} failed: ${err?.message}`));

process.on('SIGINT', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
