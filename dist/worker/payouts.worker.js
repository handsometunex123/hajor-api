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
if (redisService.onModuleInit)
    redisService.onModuleInit();
prismaService.$connect();
const transactionsService = new transactions_service_1.TransactionsService(prismaService, redisService);
async function processPayout(job) {
    const { cycleId } = job.data;
    if (!cycleId)
        throw new Error('Missing cycleId');
    console.log(`Payout job started for cycle ${cycleId}`);
    const cycle = await prisma.contributionCycle.findUnique({ where: { id: cycleId }, include: { payments: true, group: true } });
    if (!cycle)
        throw new Error('Cycle not found');
    if (cycle.status !== 'COMPLETED') {
        throw new Error('Cycle not completed; cannot execute payout');
    }
    const payments = await prisma.contributionPayment.findMany({ where: { cycleId } });
    if (!payments || payments.length === 0)
        throw new Error('No payments found for cycle');
    const nonFinalised = payments.filter((p) => p.status !== 'PAID' && p.status !== 'DEFAULTED');
    if (nonFinalised.length > 0) {
        throw new Error('Some payments are still UNPAID/FAILED; cannot execute payout');
    }
    const paidPayments = payments.filter((p) => p.status === 'PAID');
    if (paidPayments.length === 0)
        throw new Error('No paid payments found; aborting payout');
    const recipientContributor = await prisma.groupContributor.findFirst({ where: { groupId: cycle.groupId, payoutOrder: cycle.cycleNumber } });
    if (!recipientContributor)
        throw new Error('Recipient contributor not found for payoutOrder');
    const recipientUser = await prisma.user.findUnique({ where: { id: recipientContributor.userId } });
    if (!(recipientUser === null || recipientUser === void 0 ? void 0 : recipientUser.bvnVerified)) {
        throw new Error(`Recipient ${recipientContributor.userId} is not KYC-verified; cannot execute payout`);
    }
    const total = paidPayments.reduce((acc, p) => acc + Number(p.amount.toString()), 0);
    const serviceCharge = cycle.group.serviceCharge ? Number(cycle.group.serviceCharge.toString()) : 0;
    const netPayout = total - serviceCharge;
    if (netPayout <= 0)
        throw new Error('Net payout is zero or negative after service charge deduction');
    const recipientWallet = await prisma.wallet.findUnique({ where: { userId: recipientContributor.userId } });
    if (!recipientWallet)
        throw new Error('Recipient wallet not found');
    const reference = `payout:${cycleId}`;
    const existing = await transactionsService.getByReference(reference);
    if (existing) {
        console.log(`Payout already executed for cycle ${cycleId}, tx=${existing.id}`);
        return { skipped: true, txId: existing.id };
    }
    const result = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
        let groupWallet = await tx.wallet.findUnique({ where: { groupId: cycle.groupId } });
        if (!groupWallet) {
            groupWallet = await tx.wallet.create({ _internal: true, data: { groupId: cycle.groupId } });
        }
        const de = await transactionsService.createDoubleEntry({ fromWalletId: groupWallet.id, toWalletId: recipientWallet.id, amount: netPayout.toString(), reference, status: 'SUCCESS', metadata: { cycleId, recipientMemberId: recipientContributor.id, grossAmount: total, serviceCharge } }, tx);
        const payoutTxId = de && (de.credit || de.existing) ? (de.credit || de.existing) : null;
        if (serviceCharge > 0) {
            const adminWallet = await tx.wallet.findUnique({ where: { userId: cycle.group.adminId } });
            if (adminWallet) {
                const chargeRef = `service-charge:${cycleId}`;
                await transactionsService.createDoubleEntry({ fromWalletId: groupWallet.id, toWalletId: adminWallet.id, amount: serviceCharge.toString(), reference: chargeRef, status: 'SUCCESS', metadata: { cycleId, type: 'service_charge' } }, tx);
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
    try {
        const notifications = new bullmq_1.Queue('notifications', { connection });
        await notifications.add('send-notification', { userId: recipientContributor.userId, type: 'PAYOUT_SUCCESS', payload: { cycleId, txId: result.payoutTxId, amount: netPayout, serviceCharge } }, { removeOnComplete: true, attempts: 3 });
    }
    catch (err) {
        console.warn('Failed to enqueue payout notification', (err === null || err === void 0 ? void 0 : err.message) || err);
    }
    try {
        const allCycles = await prisma.contributionCycle.findMany({ where: { groupId: cycle.groupId } });
        const allDone = allCycles.every((c) => c.status === 'COMPLETED');
        if (allDone) {
            const freshGroup = await prisma.group.findUnique({ where: { id: cycle.groupId } });
            if (freshGroup && freshGroup.status !== 'COMPLETED' && freshGroup.status !== 'ARCHIVED') {
                await prisma.group.update({ where: { id: cycle.groupId }, data: { status: 'COMPLETED' } });
                console.log(`Group ${cycle.groupId} marked COMPLETED — all cycles done`);
                const contributors = await prisma.groupContributor.findMany({ where: { groupId: cycle.groupId } });
                const notifications = new bullmq_1.Queue('notifications', { connection });
                for (const c of contributors) {
                    await notifications.add('send-notification', { userId: c.userId, type: 'GROUP_COMPLETED', payload: { groupId: cycle.groupId } }, { removeOnComplete: true, attempts: 3 }).catch(() => { });
                }
            }
        }
    }
    catch (err) {
        console.warn('Failed to check group completion', (err === null || err === void 0 ? void 0 : err.message) || err);
    }
    return { ok: true, txId: result.payoutTxId };
}
const worker = new bullmq_1.Worker('payouts', async (job) => {
    console.log(`Payouts worker processing job ${job.id} name=${job.name}`);
    try {
        const res = await processPayout(job);
        return res;
    }
    catch (err) {
        console.error('Payout worker error', (err === null || err === void 0 ? void 0 : err.message) || err);
        throw err;
    }
}, { connection });
worker.on('completed', (job) => console.log(`Payout job ${job.id} (${job.name}) completed`));
worker.on('failed', (job, err) => console.error(`Payout job ${job === null || job === void 0 ? void 0 : job.id} (${job === null || job === void 0 ? void 0 : job.name}) failed: ${err === null || err === void 0 ? void 0 : err.message}`));
const shutdown = async () => {
    try {
        await worker.close();
    }
    catch (err) {
        console.error('Error closing payout worker', err);
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
        if (redisService && typeof redisService.onModuleDestroy === 'function')
            await redisService.onModuleDestroy();
    }
    catch (err) { }
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
//# sourceMappingURL=payouts.worker.js.map