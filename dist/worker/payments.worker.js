"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../infrastructure/prisma/prisma.service");
const config_1 = require("@nestjs/config");
const monitoring_service_1 = require("../infrastructure/monitoring/monitoring.service");
const redis_service_1 = require("../infrastructure/redis/redis.service");
const transactions_service_1 = require("../modules/transactions/transactions.service");
const bullmq_1 = require("bullmq");
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisDb = parseInt(process.env.REDIS_DB || '0', 10);
const connection = { host: redisHost, port: redisPort, db: redisDb };
const prisma = new client_1.PrismaClient();
const prismaService = new prisma_service_1.PrismaService();
const configService = new config_1.ConfigService();
const monitoringService = new monitoring_service_1.MonitoringService(configService);
const redisService = new redis_service_1.RedisService(configService, monitoringService);
redisService.onModuleInit && redisService.onModuleInit();
prismaService.$connect();
const transactionsService = new transactions_service_1.TransactionsService(prismaService, redisService);
const paymentsQueueName = 'payments';
const payoutsQueueName = 'payouts';
const notificationsQueueName = 'notifications';
const fraud_service_1 = require("../modules/fraud/fraud.service");
const fraudService = new fraud_service_1.FraudService(prismaService);
async function processAutoDebit(job) {
    const { cycleId } = job.data;
    if (!cycleId)
        throw new Error('Missing cycleId');
    console.log(`Auto-debit job started for cycle ${cycleId}`);
    const cycle = await prisma.contributionCycle.findUnique({ where: { id: cycleId }, include: { payments: { where: { status: 'UNPAID' }, include: { groupContributor: { include: { user: true } } } }, group: true } });
    if (!cycle)
        throw new Error('Cycle not found');
    const payments = cycle.payments;
    const results = [];
    for (const p of payments) {
        const paymentId = p.id;
        const amount = p.amount.toString();
        const userId = p.groupContributor.userId;
        const fresh = await prisma.contributionPayment.findUnique({ where: { id: paymentId } });
        if (!fresh)
            continue;
        if (fresh.status === 'PAID') {
            results.push({ paymentId, status: 'skipped_already_paid' });
            continue;
        }
        const txRef = `auto-debit:${cycleId}:${paymentId}`;
        try {
            const wallet = await prisma.wallet.findUnique({ where: { userId } });
            if (!wallet) {
                await prisma.contributionPayment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
                results.push({ paymentId, status: 'failed_no_wallet' });
                continue;
            }
            if (wallet.paystackProvisionStatus !== 'PROVISIONED') {
                await prisma.contributionPayment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
                const notifications = new bullmq_1.Queue(notificationsQueueName, { connection });
                await notifications.add('send-notification', { userId, type: 'WALLET_NOT_PROVISIONED', payload: { paymentId, cycleId } }, { removeOnComplete: true, attempts: 1 });
                results.push({ paymentId, status: 'failed_not_provisioned' });
                continue;
            }
            const credit = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId: wallet.id, type: 'CREDIT', status: 'SUCCESS' } });
            const debit = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { walletId: wallet.id, type: 'DEBIT', status: 'SUCCESS' } });
            const creditSum = credit._sum.amount ? Number(credit._sum.amount.toString()) : 0;
            const debitSum = debit._sum.amount ? Number(debit._sum.amount.toString()) : 0;
            const balance = creditSum - debitSum;
            if (balance < Number(amount)) {
                await prisma.contributionPayment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
                const notifications = new bullmq_1.Queue(notificationsQueueName, { connection });
                await notifications.add('send-notification', { userId, type: 'DEBIT_FAILED', payload: { paymentId, cycleId, amount } }, { removeOnComplete: true, attempts: 1 });
                results.push({ paymentId, status: 'failed_insufficient_funds' });
                continue;
            }
            await prismaService.$transaction(async (tx) => {
                await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                const cycleRow = await tx.contributionCycle.findUnique({ where: { id: cycleId }, select: { groupId: true } });
                const groupId = cycleRow === null || cycleRow === void 0 ? void 0 : cycleRow.groupId;
                if (!groupId)
                    throw new Error('Group not found for cycle when creating group wallet');
                let groupWallet = await tx.wallet.findUnique({ where: { groupId } });
                if (!groupWallet) {
                    groupWallet = await tx.wallet.create({ _internal: true, data: { groupId } });
                }
                const de = await transactionsService.createDoubleEntry({ fromWalletId: wallet.id, toWalletId: groupWallet.id, amount: amount, reference: txRef, status: 'SUCCESS', metadata: { cycleId, paymentId } }, tx);
                const txIdForAudit = de && (de.debit || de.existing) ? (de.debit || de.existing) : null;
                const currentPayment = await tx.contributionPayment.findUnique({ where: { id: paymentId } });
                if (currentPayment && currentPayment.status !== 'PAID') {
                    await tx.contributionPayment.update({ where: { id: paymentId }, data: { status: 'PAID', paidAt: new Date() } });
                }
                await tx.auditLog.create({ data: { actorId: null, action: 'worker_auto_debit', entityType: 'ContributionPayment', entityId: paymentId, metadata: { txId: txIdForAudit, cycleId, groupId } } });
            });
            const notifications = new bullmq_1.Queue(notificationsQueueName, { connection });
            await notifications.add('send-notification', { userId, type: 'PAYMENT_SUCCESS', payload: { paymentId, cycleId, amount } }, { removeOnComplete: true, attempts: 1 });
            results.push({ paymentId, status: 'paid' });
        }
        catch (err) {
            console.error('Auto-debit error for payment', paymentId, err);
            try {
                await prisma.contributionPayment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
            }
            catch (e) { }
            results.push({ paymentId, status: 'failed_error', error: (err === null || err === void 0 ? void 0 : err.message) || String(err) });
        }
    }
    const failedUserIds = new Set(results.filter((r) => { var _a; return (_a = r.status) === null || _a === void 0 ? void 0 : _a.startsWith('failed'); }).map((r) => {
        var _a;
        const p = payments.find((pay) => pay.id === r.paymentId);
        return (_a = p === null || p === void 0 ? void 0 : p.groupContributor) === null || _a === void 0 ? void 0 : _a.userId;
    }).filter(Boolean));
    for (const uid of failedUserIds) {
        try {
            await fraudService.checkDefaultRate(uid);
        }
        catch (err) {
            console.warn('Fraud check failed for user', uid, (err === null || err === void 0 ? void 0 : err.message) || err);
        }
    }
    try {
        const paymentsAll = await prisma.contributionPayment.findMany({ where: { cycleId } });
        const allPaid = paymentsAll.length > 0 && paymentsAll.every((p) => p.status === 'PAID');
        if (allPaid) {
            await prisma.contributionCycle.update({ where: { id: cycleId }, data: { status: 'COMPLETED' } });
            const payouts = new bullmq_1.Queue(payoutsQueueName, { connection });
            const contributionDate = cycle.contributionDate;
            const payoutDelay = Math.max(0, new Date(contributionDate).getTime() + 24 * 60 * 60 * 1000 - Date.now());
            await payouts.add('process-payout', { cycleId }, { delay: payoutDelay, jobId: cycleId, removeOnComplete: true });
        }
        else {
            const failedCount = paymentsAll.filter((p) => p.status === 'FAILED').length;
            if (failedCount > 0) {
                const payments = new bullmq_1.Queue(paymentsQueueName, { connection });
                await payments.add('retry-failed-payments', { cycleId }, {
                    delay: 60 * 60 * 1000,
                    jobId: `auto_retry_${cycleId}_${Date.now()}`,
                    removeOnComplete: true,
                    attempts: 1,
                });
                console.log(`Scheduled automatic retry for ${failedCount} failed payment(s) in cycle ${cycleId}`);
            }
        }
    }
    catch (err) {
        console.error('Error checking cycle completion', err);
    }
    console.log(`Auto-debit job finished for cycle ${cycleId}`, results);
    return { results };
}
async function processRetryFailed(job) {
    const { cycleId } = job.data;
    if (!cycleId)
        throw new Error('Missing cycleId');
    console.log(`Retry-failed-payments started for cycle ${cycleId}`);
    const failedPayments = await prisma.contributionPayment.findMany({ where: { cycleId, status: 'FAILED' }, include: { groupContributor: { include: { user: true } } } });
    for (const p of failedPayments) {
        try {
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
                await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                const cycleRow = await tx.contributionCycle.findUnique({ where: { id: cycleId }, select: { groupId: true } });
                const groupId = cycleRow === null || cycleRow === void 0 ? void 0 : cycleRow.groupId;
                if (!groupId)
                    throw new Error('Group not found for cycle when creating group wallet');
                let groupWallet = await tx.wallet.findUnique({ where: { groupId } });
                if (!groupWallet) {
                    groupWallet = await tx.wallet.create({ _internal: true, data: { groupId } });
                }
                const de = await transactionsService.createDoubleEntry({ fromWalletId: wallet.id, toWalletId: groupWallet.id, amount: amount, reference: txRef, status: 'SUCCESS', metadata: { cycleId, paymentId } }, tx);
                const txIdForAudit = de && (de.debit || de.existing) ? (de.debit || de.existing) : null;
                const currentPayment = await tx.contributionPayment.findUnique({ where: { id: paymentId } });
                if (currentPayment && currentPayment.status !== 'PAID') {
                    await tx.contributionPayment.update({ where: { id: paymentId }, data: { status: 'PAID', paidAt: new Date() } });
                }
                await tx.auditLog.create({ data: { actorId: null, action: 'worker_retry_debit', entityType: 'ContributionPayment', entityId: paymentId, metadata: { txId: txIdForAudit, cycleId, groupId } } });
            });
        }
        catch (err) {
            console.error('Retry debit failed for', p.id, err);
        }
    }
    try {
        const paymentsAll = await prisma.contributionPayment.findMany({ where: { cycleId } });
        const allPaid = paymentsAll.length > 0 && paymentsAll.every((p) => p.status === 'PAID');
        if (allPaid) {
            await prisma.contributionCycle.update({ where: { id: cycleId }, data: { status: 'COMPLETED' } });
            const payouts = new bullmq_1.Queue(payoutsQueueName, { connection });
            const contributionDate = (await prisma.contributionCycle.findUnique({ where: { id: cycleId } })).contributionDate;
            const payoutDelay = Math.max(0, new Date(contributionDate).getTime() + 24 * 60 * 60 * 1000 - Date.now());
            await payouts.add('process-payout', { cycleId }, { delay: payoutDelay, jobId: cycleId, removeOnComplete: true });
        }
        else {
            const stillFailed = paymentsAll.filter((p) => p.status === 'FAILED');
            if (stillFailed.length > 0) {
                const notifications = new bullmq_1.Queue(notificationsQueueName, { connection });
                for (const p of stillFailed) {
                    try {
                        const contrib = await prisma.groupContributor.findUnique({ where: { id: p.groupContributorId }, select: { userId: true } });
                        if (contrib) {
                            await notifications.add('send-notification', { userId: contrib.userId, type: 'PAYMENT_FAILED', payload: { paymentId: p.id, cycleId, amount: p.amount.toString() } }, { removeOnComplete: true });
                        }
                    }
                    catch (_) { }
                }
                try {
                    const graceQueue = new bullmq_1.Queue(paymentsQueueName, { connection });
                    await graceQueue.add('grace-period-reminder', { cycleId, dayNumber: 1 }, {
                        delay: 24 * 60 * 60 * 1000,
                        jobId: `grace_reminder_${cycleId}_day1`,
                        removeOnComplete: true,
                    });
                }
                catch (err) {
                    console.warn('Failed to schedule grace-period-reminder', (err === null || err === void 0 ? void 0 : err.message) || err);
                }
            }
        }
    }
    catch (err) {
        console.error('Error checking cycle completion after retries', err);
    }
    console.log(`Retry-failed-payments finished for cycle ${cycleId}`);
    return { ok: true };
}
async function processGracePeriodReminder(job) {
    var _a;
    const { cycleId, dayNumber } = job.data;
    if (!cycleId)
        throw new Error('Missing cycleId');
    console.log(`Grace-period-reminder day ${dayNumber} for cycle ${cycleId}`);
    const cycle = await prisma.contributionCycle.findUnique({
        where: { id: cycleId },
        include: { group: true, payments: { include: { groupContributor: { select: { userId: true } } } } },
    });
    if (!cycle || cycle.status !== 'COLLECTING') {
        console.log(`Grace-period-reminder skipped — cycle ${cycleId} not in COLLECTING status`);
        return { ok: true, reason: 'not_collecting' };
    }
    const gracePeriodDays = (_a = cycle.group.gracePeriodDays) !== null && _a !== void 0 ? _a : 1;
    const graceEndDate = new Date(cycle.contributionDate);
    graceEndDate.setUTCDate(graceEndDate.getUTCDate() + gracePeriodDays);
    const notifications = new bullmq_1.Queue(notificationsQueueName, { connection });
    const outstanding = cycle.payments.filter((p) => p.status === 'FAILED' || p.status === 'UNPAID');
    for (const p of outstanding) {
        try {
            await notifications.add('send-notification', { userId: p.groupContributor.userId, type: 'PAYMENT_REMINDER', payload: { cycleId, paymentId: p.id, dayNumber, graceEndDate } }, { removeOnComplete: true });
        }
        catch (_) { }
    }
    const now = new Date();
    if (now < graceEndDate) {
        const paymentsQueue = new bullmq_1.Queue(paymentsQueueName, { connection });
        await paymentsQueue.add('grace-period-reminder', { cycleId, dayNumber: dayNumber + 1 }, { delay: 24 * 60 * 60 * 1000, jobId: `grace_reminder_${cycleId}_day${dayNumber + 1}`, removeOnComplete: true });
    }
    console.log(`Grace-period-reminder day ${dayNumber} sent ${outstanding.length} reminder(s) for cycle ${cycleId}`);
    return { ok: true, reminders: outstanding.length };
}
const worker = new bullmq_1.Worker(paymentsQueueName, async (job) => {
    console.log(`Payments worker processing job ${job.id} name=${job.name}`);
    if (job.name === 'auto-debit-cycle')
        return processAutoDebit(job);
    if (job.name === 'retry-failed-payments')
        return processRetryFailed(job);
    if (job.name === 'grace-period-reminder')
        return processGracePeriodReminder(job);
    console.log('Unknown payments job', job.name);
    return { ok: false };
}, { connection });
worker.on('completed', (job) => console.log(`Payments job ${job.id} (${job.name}) completed`));
worker.on('failed', (job, err) => console.error(`Payments job ${job === null || job === void 0 ? void 0 : job.id} (${job === null || job === void 0 ? void 0 : job.name}) failed: ${err === null || err === void 0 ? void 0 : err.message}`));
const shutdown = async () => {
    try {
        await worker.close();
    }
    catch (err) {
        console.error('Error closing worker', err);
    }
    try {
        await prisma.$disconnect();
    }
    catch (err) { }
    try {
        await prismaService.$disconnect();
    }
    catch (err) { }
    try {
        if (redisService && typeof redisService.onModuleDestroy === 'function') {
            await redisService.onModuleDestroy();
        }
    }
    catch (err) { }
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
//# sourceMappingURL=payments.worker.js.map