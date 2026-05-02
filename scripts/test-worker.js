/**
 * test-worker.js
 *
 * Fires a real auto-debit-cycle job and shows what changed in the DB.
 *
 * Usage:
 *   node scripts/test-worker.js               ← auto-picks the first PENDING cycle from DB
 *   node scripts/test-worker.js <cycleId>      ← uses the specified cycle
 */

require('dotenv').config();
const { Queue, QueueEvents } = require('bullmq');
const { PrismaClient }       = require('@prisma/client');

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_DB   = parseInt(process.env.REDIS_DB  || '0',    10);
const connection = { host: REDIS_HOST, port: REDIS_PORT, db: REDIS_DB };

const DELAY_MS   = 5_000;
const TIMEOUT_MS = 30_000;

const prisma = new PrismaClient();

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(val) {
  if (val == null) return 'null';
  if (val instanceof Date) return val.toLocaleString();
  return String(val);
}

function sep(label) {
  const line = '─'.repeat(50);
  console.log(`\n${line}`);
  if (label) console.log(`  ${label}`);
  console.log(line);
}

async function getBalance(walletId) {
  const [credit, debit] = await Promise.all([
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId, type: 'CREDIT',  status: 'SUCCESS' } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId, type: 'DEBIT',   status: 'SUCCESS' } }),
  ]);
  return (Number(credit._sum.amount ?? 0)) - (Number(debit._sum.amount ?? 0));
}

async function snapshot(cycleId) {
  const cycle = await prisma.contributionCycle.findUnique({
    where: { id: cycleId },
    include: {
      payments: {
        include: {
          groupContributor: {
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          },
        },
      },
      group: { select: { name: true } },
    },
  });

  if (!cycle) return null;

  const rows = [];
  for (const p of cycle.payments) {
    const user   = p.groupContributor?.user;
    const wallet = await prisma.wallet.findUnique({ where: { userId: user?.id }, select: { id: true, paystackProvisionStatus: true } });
    const bal    = wallet ? await getBalance(wallet.id) : null;
    rows.push({
      contributor : user ? `${user.firstName} ${user.lastName}` : p.groupContributorId,
      payment     : p.status,
      amount      : Number(p.amount),
      walletStatus: wallet?.paystackProvisionStatus ?? 'NO WALLET',
      balance     : bal !== null ? bal : '—',
    });
  }

  return { cycleStatus: cycle.status, groupName: cycle.group?.name, rows };
}

function printSnapshot(label, data) {
  if (!data) { console.log(`  (cycle not found)`); return; }
  sep(label);
  console.log(`  Group : ${data.groupName}`);
  console.log(`  Cycle : ${data.cycleStatus}`);
  console.log('');
  const header = `  ${'Contributor'.padEnd(28)} ${'Payment'.padEnd(12)} ${'Amount'.padStart(10)}  ${'Wallet'.padEnd(14)} ${'Balance'.padStart(12)}`;
  console.log(header);
  console.log(`  ${'-'.repeat(80)}`);
  for (const r of data.rows) {
    console.log(
      `  ${r.contributor.padEnd(28)} ${r.payment.padEnd(12)} ${String(r.amount).padStart(10)}  ${r.walletStatus.padEnd(14)} ${String(r.balance).padStart(12)}`
    );
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  let cycleId = process.argv[2];

  // If no cycleId supplied, find the first PENDING or COLLECTING cycle in a STARTED group
  if (!cycleId) {
    const cycle = await prisma.contributionCycle.findFirst({
      where: {
        status: { in: ['PENDING', 'COLLECTING'] },
        group: { status: 'STARTED' },
      },
      orderBy: { contributionDate: 'asc' },
      select: { id: true, cycleNumber: true, contributionDate: true, groupId: true, status: true },
    });

    if (!cycle) {
      console.log('\nNo PENDING or COLLECTING cycles found in any STARTED group.');
      console.log('Start a group first, then run this script again.');
      await prisma.$disconnect();
      process.exit(0);
    }

    cycleId = cycle.id;
    console.log(`\nAuto-selected cycle:`);
    console.log(`  id             : ${cycle.id}`);
    console.log(`  cycleNumber    : ${cycle.cycleNumber}`);
    console.log(`  status         : ${cycle.status}`);
    console.log(`  contributionDate: ${fmt(cycle.contributionDate)}`);
  }

  // ── pre-run snapshot ────────────────────────────────────────────────────────
  const before = await snapshot(cycleId);
  printSnapshot('BEFORE — state before auto-debit fires', before);

  if (!before) {
    console.log(`\nCycle ${cycleId} not found in DB.`);
    await prisma.$disconnect();
    process.exit(1);
  }

  // ── reset FAILED payments back to UNPAID so the worker can retry ────────────
  const resetCount = await prisma.contributionPayment.updateMany({
    where: { cycleId, status: 'FAILED' },
    data:  { status: 'UNPAID' },
  });
  if (resetCount.count > 0) {
    console.log(`\n  [reset] ${resetCount.count} FAILED payment(s) → UNPAID before queuing.`);
  }

  // ── queue the job ───────────────────────────────────────────────────────────
  sep(`QUEUING JOB`);
  const queue       = new Queue('payments', { connection });
  const queueEvents = new QueueEvents('payments', { connection });
  await queueEvents.waitUntilReady();

  const jobId = `test_real_${Date.now()}`;
  const job   = await queue.add(
    'auto-debit-cycle',
    { cycleId },
    { jobId, delay: DELAY_MS, attempts: 1, removeOnComplete: false, removeOnFail: false },
  );

  console.log(`  Job id   : ${job.id}`);
  console.log(`  Fires at : ${new Date(Date.now() + DELAY_MS).toLocaleTimeString()}`);
  console.log(`  Waiting up to ${TIMEOUT_MS / 1000}s for the worker...`);

  // ── wait for result ─────────────────────────────────────────────────────────
  await new Promise((resolve) => {
    let done = false;

    const finish = (label) => {
      if (done) return;
      done = true;
      console.log(`\n  ${label}`);
      resolve(undefined);
    };

    const timer = setTimeout(() => finish('[ FAIL ] Worker did not respond within 30s — is start:dev running?'), TIMEOUT_MS);

    queueEvents.on('active',    ({ jobId: jid }) => { if (jid === job.id) console.log(`  → ACTIVE — worker picked it up`); });
    queueEvents.on('completed', ({ jobId: jid, returnvalue }) => {
      if (jid !== job.id) return;
      clearTimeout(timer);
      try {
        const rv = typeof returnvalue === 'string' ? JSON.parse(returnvalue) : returnvalue;
        console.log(`\n  Return value:`);
        console.log(JSON.stringify(rv, null, 4).split('\n').map(l => '  ' + l).join('\n'));
      } catch (_) {}
      finish('[ PASS ] Job COMPLETED');
    });
    queueEvents.on('failed', ({ jobId: jid, failedReason }) => {
      if (jid !== job.id) return;
      clearTimeout(timer);
      finish(`[ FAIL ] Job failed: ${failedReason}`);
    });
  });

  // ── post-run snapshot ───────────────────────────────────────────────────────
  await new Promise(r => setTimeout(r, 500)); // brief wait for DB writes to settle
  const after = await snapshot(cycleId);
  printSnapshot('AFTER — state after auto-debit ran', after);

  // ── diff summary ────────────────────────────────────────────────────────────
  sep('SUMMARY OF CHANGES');
  if (before && after) {
    if (before.cycleStatus !== after.cycleStatus) {
      console.log(`  Cycle status : ${before.cycleStatus}  →  ${after.cycleStatus}`);
    } else {
      console.log(`  Cycle status : ${after.cycleStatus} (unchanged)`);
    }
    for (let i = 0; i < before.rows.length; i++) {
      const b = before.rows[i];
      const a = after.rows[i];
      if (!a) continue;
      const changed = b.payment !== a.payment || b.balance !== a.balance;
      if (changed) {
        console.log(`  ${b.contributor.padEnd(28)} payment ${b.payment} → ${a.payment}   balance ${b.balance} → ${a.balance}`);
      } else {
        console.log(`  ${b.contributor.padEnd(28)} no change  (${a.payment})`);
      }
    }
  }
  console.log('');

  // cleanup disabled — job stays visible in Bull Board dashboard
  // try { const j = await queue.getJob(job.id); if (j) await j.remove(); } catch (_) {}
  await queueEvents.close();
  await queue.close();
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('\nScript error:', err.message || err);
  await prisma.$disconnect();
  process.exit(1);
});
