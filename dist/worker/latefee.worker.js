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
async function processApplyLateFees(job) {
    var _a;
    console.log('Late-fee worker started');
    const now = new Date();
    const rows = await prisma.contributionCycle.findMany({ where: { payoutDate: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }, include: { payments: { where: { status: { not: 'PAID' } }, include: { groupContributor: true } }, group: true } });
    const notifications = new bullmq_1.Queue('notifications', { connection });
    const results = [];
    for (const cycle of rows) {
        const lateFee = Number(((_a = cycle.group) === null || _a === void 0 ? void 0 : _a.lateFee) || 0);
        if (!lateFee || lateFee <= 0)
            continue;
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
            let groupWallet = await tx.wallet.findUnique({ where: { groupId: cycle.groupId } });
            if (!groupWallet)
                groupWallet = await tx.wallet.create({ _internal: true, data: { groupId: cycle.groupId } });
            for (const p of cycle.payments) {
                try {
                    const paymentId = p.id;
                    const userId = p.groupContributor.userId;
                    const wallet = await tx.wallet.findUnique({ where: { userId } });
                    if (!wallet) {
                        await tx.auditLog.create({ data: { actorId: null, action: 'late_fee_failed_no_wallet', entityType: 'ContributionPayment', entityId: paymentId, metadata: { cycleId: cycle.id, groupId: cycle.groupId, userId } } });
                        results.push({ paymentId, status: 'no_wallet' });
                        continue;
                    }
                    const credit = await tx.transaction.aggregate({ _sum: { amount: true }, where: { walletId: wallet.id, type: 'CREDIT', status: 'SUCCESS' } });
                    const debit = await tx.transaction.aggregate({ _sum: { amount: true }, where: { walletId: wallet.id, type: 'DEBIT', status: 'SUCCESS' } });
                    const creditSum = credit._sum.amount ? Number(credit._sum.amount.toString()) : 0;
                    const debitSum = debit._sum.amount ? Number(debit._sum.amount.toString()) : 0;
                    const balance = creditSum - debitSum;
                    if (balance < lateFee) {
                        await tx.auditLog.create({ data: { actorId: null, action: 'late_fee_insufficient_funds', entityType: 'ContributionPayment', entityId: paymentId, metadata: { cycleId: cycle.id, groupId: cycle.groupId, userId, lateFee } } });
                        results.push({ paymentId, status: 'insufficient_funds' });
                        continue;
                    }
                    const ref = `late-fee:${cycle.id}:${paymentId}`;
                    const de = await transactionsService.createDoubleEntry({ fromWalletId: wallet.id, toWalletId: groupWallet.id, amount: lateFee.toString(), reference: ref, status: 'SUCCESS', metadata: { cycleId: cycle.id, paymentId } }, tx);
                    await tx.auditLog.create({ data: { actorId: null, action: 'late_fee_applied', entityType: 'ContributionPayment', entityId: paymentId, metadata: { tx: de, lateFee, cycleId: cycle.id, groupId: cycle.groupId } } });
                    try {
                        await notifications.add('send-notification', { userId, type: 'LATE_FEE_CHARGED', payload: { cycleId: cycle.id, paymentId, amount: lateFee } }, { removeOnComplete: true });
                    }
                    catch (err) { }
                    results.push({ paymentId, status: 'charged' });
                }
                catch (err) {
                    console.error('Late fee error', err.message || err);
                }
            }
        });
    }
    console.log('Late-fee worker finished', results);
    return { results };
}
const worker = new bullmq_1.Worker('latefee', async (job) => {
    console.log(`Late-fee worker processing job ${job.id} name=${job.name}`);
    try {
        const res = await processApplyLateFees(job);
        return res;
    }
    catch (err) {
        console.error('Late-fee worker error', (err === null || err === void 0 ? void 0 : err.message) || err);
        throw err;
    }
}, { connection });
worker.on('completed', (job) => console.log(`Late-fee job ${job.id} (${job.name}) completed`));
worker.on('failed', (job, err) => console.error(`Late-fee job ${job === null || job === void 0 ? void 0 : job.id} (${job === null || job === void 0 ? void 0 : job.name}) failed: ${err === null || err === void 0 ? void 0 : err.message}`));
const shutdown = async () => {
    try {
        await worker.close();
    }
    catch (err) {
        console.error('Error closing latefee worker', err);
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
//# sourceMappingURL=latefee.worker.js.map