"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const alert_1 = require("../infrastructure/monitoring/alert");
const bullmq_1 = require("bullmq");
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisDb = parseInt(process.env.REDIS_DB || '0', 10);
const connection = { host: redisHost, port: redisPort, db: redisDb };
const prisma = new client_1.PrismaClient();
async function reconcilePaystack() {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const base = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
    if (!secret)
        throw new Error('PAYSTACK_SECRET_KEY not configured');
    const summary = { checked: 0, missing: 0, mismatched: 0, autoFixed: 0 };
    try {
        const res = await axios_1.default.get(`${base}/transaction`, { headers: { Authorization: `Bearer ${secret}` } });
        const data = res.data;
        const providerTxs = ((data === null || data === void 0 ? void 0 : data.data) || []);
        for (const p of providerTxs) {
            summary.checked++;
            const providerRef = p.reference || p.id;
            const amount = p.amount ? p.amount / 100 : null;
            let tx = await prisma.transaction.findFirst({ where: { reference: { contains: providerRef } } });
            if (!tx) {
                try {
                    tx = await prisma.transaction.findFirst({ where: { metadata: { path: ['providerReference'], equals: providerRef } } });
                }
                catch (_) { }
            }
            if (!tx) {
                summary.missing++;
                await prisma.auditLog.create({ data: { actorId: null, action: 'reconcile_missing_tx', entityType: 'ExternalTransaction', entityId: providerRef, metadata: { provider: 'paystack', providerPayload: p } } });
                try {
                    await (0, alert_1.sendAlert)('reconcile_missing_tx', { provider: 'paystack', providerRef, providerPayload: p });
                }
                catch (alertErr) {
                    console.warn('Alert send failed for reconcile_missing_tx', alertErr === null || alertErr === void 0 ? void 0 : alertErr.message);
                }
            }
            else {
                const internalAmount = Number(tx.amount.toString());
                if (amount != null && Math.abs(internalAmount - amount) > 0.01) {
                    summary.mismatched++;
                    if (tx.status === 'PENDING') {
                        await prisma.$transaction(async (client) => {
                            await client.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                            await client.transaction.update({ where: { id: tx.id }, data: { amount: amount } });
                        });
                        summary.autoFixed++;
                        await prisma.auditLog.create({ data: { actorId: null, action: 'reconcile_auto_fix', entityType: 'Transaction', entityId: tx.id, metadata: { provider: 'paystack', providerRef, providerAmount: amount, oldAmount: internalAmount } } });
                    }
                    else {
                        await prisma.auditLog.create({ data: { actorId: null, action: 'reconcile_amount_mismatch', entityType: 'Transaction', entityId: tx.id, metadata: { provider: 'paystack', providerRef, providerAmount: amount, internalAmount } } });
                    }
                    try {
                        await (0, alert_1.sendAlert)('reconcile_amount_mismatch', { provider: 'paystack', providerRef, providerAmount: amount, internalAmount, txId: tx.id, autoFixed: tx.status === 'PENDING' });
                    }
                    catch (alertErr) {
                        console.warn('Alert send failed for reconcile_amount_mismatch', alertErr === null || alertErr === void 0 ? void 0 : alertErr.message);
                    }
                }
            }
        }
        console.log('Reconciliation pass complete', summary);
        if (summary.missing > 0 || summary.mismatched > 0) {
            try {
                await (0, alert_1.sendAlert)('reconciliation_summary', summary);
            }
            catch (alertErr) {
                console.warn('Alert send failed for reconciliation_summary', alertErr === null || alertErr === void 0 ? void 0 : alertErr.message);
            }
        }
        return summary;
    }
    catch (err) {
        console.error('Reconciliation failed', (err === null || err === void 0 ? void 0 : err.message) || err);
        try {
            await (0, alert_1.sendAlert)('reconciliation_failed', { error: (err === null || err === void 0 ? void 0 : err.message) || String(err) });
        }
        catch (alertErr) {
            console.warn('Alert send failed for reconciliation_failed', alertErr === null || alertErr === void 0 ? void 0 : alertErr.message);
        }
        throw err;
    }
}
const worker = new bullmq_1.Worker('reconciliation', async (job) => {
    console.log(`Reconciliation worker processing job ${job.id}`);
    return reconcilePaystack();
}, { connection });
worker.on('completed', (job) => console.log(`Reconciliation job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`Reconciliation job ${job === null || job === void 0 ? void 0 : job.id} failed: ${err === null || err === void 0 ? void 0 : err.message}`));
if (require.main === module) {
    reconcilePaystack()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
exports.default = reconcilePaystack;
//# sourceMappingURL=reconciliation.worker.js.map