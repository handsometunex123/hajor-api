"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PaymentWebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentWebhookService = void 0;
const common_1 = require("@nestjs/common");
const transactions_service_1 = require("../transactions/transactions.service");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const queue_service_1 = require("../../infrastructure/queue/queue.service");
const fraud_service_1 = require("../fraud/fraud.service");
let PaymentWebhookService = PaymentWebhookService_1 = class PaymentWebhookService {
    constructor(transactions, prisma, queue, fraud) {
        this.transactions = transactions;
        this.prisma = prisma;
        this.queue = queue;
        this.fraud = fraud;
        this.logger = new common_1.Logger(PaymentWebhookService_1.name);
    }
    async handleProviderCharge(payload) {
        const { provider, providerId, walletOwnerId, reference, amount, metadata } = payload;
        const txRef = `provider:${provider}:charge:${providerId}|ref:${reference}`;
        const tx = await this.transactions.createTransaction({
            walletId: walletOwnerId,
            type: 'DEBIT',
            amount: amount.toString(),
            reference: txRef,
            status: 'PENDING',
            metadata: { provider, providerId, ...metadata },
        });
        this.logger.log(`Mapped provider charge to tx ${tx.id} reference=${txRef}`);
        try {
            if (reference) {
                const payment = await this.prisma.contributionPayment.findFirst({ where: { id: reference } });
                if (payment) {
                    await this.prisma.auditLog.create({ data: { actorId: null, action: 'provider_charge_received', entityType: 'ContributionPayment', entityId: payment.id, metadata: { txId: tx.id, provider, providerId } } });
                }
            }
        }
        catch (err) {
            this.logger.warn('Failed to attach provider metadata', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        return tx;
    }
    async handleProviderPayout(payload) {
        const { provider, providerId, reference, amount, metadata } = payload;
        const txRef = `provider:${provider}:payout:${providerId}|ref:${reference}`;
        const tx = await this.transactions.createTransaction({
            walletId: undefined,
            type: 'CREDIT',
            amount: amount.toString(),
            reference: txRef,
            status: 'PENDING',
            metadata: { provider, providerId, ref: reference, ...metadata },
        });
        this.logger.log(`Mapped provider payout to tx ${tx.id} reference=${txRef}`);
        return tx;
    }
    async confirmProviderCharge(payload) {
        var _a, _b;
        const { provider, providerId, reference, amount, providerStatus } = payload;
        const txRef = `provider:${provider}:charge:${providerId}|ref:${reference}`;
        const existing = await this.transactions.getByReference(txRef);
        let txRecord = existing;
        if (!txRecord) {
            txRecord = await this.prisma.transaction.findFirst({ where: { reference: { contains: `ref:${reference}` } } });
        }
        if (!txRecord) {
            this.logger.warn(`No matching transaction found for provider confirmation provider=${provider} providerId=${providerId} ref=${reference}`);
            await this.prisma.auditLog.create({
                data: { actorId: null, action: 'webhook_unmatched', entityType: 'Transaction', entityId: providerId, metadata: { provider, providerId, reference, amount, providerStatus } },
            });
            return { found: false };
        }
        const res = await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
            const baseMeta = txRecord.metadata && typeof txRecord.metadata === 'object' ? txRecord.metadata : {};
            const newMeta = Object.assign({}, baseMeta, { providerConfirmed: true, providerStatus });
            const updatedTx = await tx.transaction.update({ where: { id: txRecord.id }, data: { status: 'SUCCESS', metadata: newMeta } });
            let paymentUpdated = null;
            const m = txRecord.reference.match(/\|ref:(.+)$/);
            const paymentId = m ? m[1] : null;
            if (paymentId) {
                const payment = await tx.contributionPayment.findUnique({ where: { id: paymentId } });
                if (payment && payment.status !== 'PAID') {
                    paymentUpdated = await tx.contributionPayment.update({ where: { id: paymentId }, data: { status: 'PAID', paidAt: new Date() } });
                }
            }
            await tx.auditLog.create({ data: { actorId: null, action: 'provider_charge_confirmed', entityType: 'Transaction', entityId: updatedTx.id, metadata: { provider, providerId, reference, paymentUpdatedId: (paymentUpdated === null || paymentUpdated === void 0 ? void 0 : paymentUpdated.id) || null } } });
            return { updatedTx, paymentUpdated };
        });
        this.logger.log(`Provider charge confirmed tx=${res.updatedTx.id} paymentUpdated=${!!res.paymentUpdated}`);
        try {
            if (res.paymentUpdated) {
                const p = await this.prisma.contributionPayment.findUnique({ where: { id: res.paymentUpdated.id }, include: { groupContributor: true } });
                const userId = ((_a = p === null || p === void 0 ? void 0 : p.groupContributor) === null || _a === void 0 ? void 0 : _a.userId) || null;
                if (userId)
                    await this.queue.addNotificationJob('send-notification', { userId, type: 'PAYMENT_SUCCESS', payload: { paymentId: p.id } });
            }
        }
        catch (err) {
            this.logger.warn('Failed to enqueue payment success notification', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        try {
            if (!res.paymentUpdated && providerStatus && /failed|error|declin/i.test(providerStatus)) {
                const m = txRecord.reference.match(/\|ref:(.+)$/);
                const paymentId = m ? m[1] : null;
                if (paymentId) {
                    const payment = await this.prisma.contributionPayment.findUnique({ where: { id: paymentId }, include: { groupContributor: true } });
                    const userId = ((_b = payment === null || payment === void 0 ? void 0 : payment.groupContributor) === null || _b === void 0 ? void 0 : _b.userId) || null;
                    if (userId) {
                        this.fraud.checkDefaultRate(userId).catch((err) => {
                            this.logger.warn('Fraud default-rate check failed', (err === null || err === void 0 ? void 0 : err.message) || err);
                        });
                    }
                }
            }
        }
        catch (err) {
            this.logger.warn('Failed to run fraud default-rate check', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        return { ok: true, txId: res.updatedTx.id, paymentUpdated: !!res.paymentUpdated };
    }
    async confirmProviderTransfer(payload) {
        const { provider, providerId, reference, amount, providerStatus } = payload;
        let txRecord = await this.prisma.transaction.findFirst({ where: { reference: { contains: reference } } });
        if (!txRecord) {
            try {
                txRecord = await this.prisma.transaction.findFirst({ where: { metadata: { path: ['providerReference'], equals: reference } } });
            }
            catch (_) {
            }
        }
        if (!txRecord) {
            this.logger.warn(`No matching transaction found for provider transfer confirmation provider=${provider} providerId=${providerId} ref=${reference}`);
            return { found: false };
        }
        const res = await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
            const baseMeta = txRecord.metadata && typeof txRecord.metadata === 'object' ? txRecord.metadata : {};
            const newMeta = Object.assign({}, baseMeta, { providerConfirmed: true, providerStatus });
            const status = providerStatus && /success/i.test(providerStatus) ? 'SUCCESS' : (providerStatus && /failed|error/i.test(providerStatus) ? 'FAILED' : 'SUCCESS');
            const updatedTx = await tx.transaction.update({ where: { id: txRecord.id }, data: { status, metadata: newMeta } });
            await tx.auditLog.create({ data: { actorId: null, action: 'provider_transfer_confirmed', entityType: 'Transaction', entityId: updatedTx.id, metadata: { provider, providerId, reference } } });
            return { updatedTx };
        });
        this.logger.log(`Provider transfer confirmed tx=${res.updatedTx.id}`);
        try {
            const txRec = await this.prisma.transaction.findUnique({ where: { id: res.updatedTx.id } });
            if (txRec && txRec.walletId) {
                const wallet = await this.prisma.wallet.findUnique({ where: { id: txRec.walletId } });
                const userId = (wallet === null || wallet === void 0 ? void 0 : wallet.userId) || null;
                if (userId)
                    await this.queue.addNotificationJob('send-notification', { userId, type: /success/i.test(res.updatedTx.status) ? 'PAYOUT_SUCCESS' : 'PAYMENT_FAILED', payload: { txId: res.updatedTx.id } });
            }
        }
        catch (err) {
            this.logger.warn('Failed to enqueue provider transfer notification', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        return { ok: true, txId: res.updatedTx.id };
    }
    async handleProviderDeposit(payload) {
        var _a, _b;
        const { provider, providerId, reference, amount, metadata } = payload;
        const txRef = `provider:${provider}:deposit:${providerId}|ref:${reference || ''}`;
        let wallet = null;
        try {
            const vaId = (metadata === null || metadata === void 0 ? void 0 : metadata.virtualAccountId) || ((_a = metadata === null || metadata === void 0 ? void 0 : metadata.virtual_account) === null || _a === void 0 ? void 0 : _a.id) || (metadata === null || metadata === void 0 ? void 0 : metadata.recipient) || (metadata === null || metadata === void 0 ? void 0 : metadata.recipient_code) || null;
            const acct = (metadata === null || metadata === void 0 ? void 0 : metadata.accountNumber) || (metadata === null || metadata === void 0 ? void 0 : metadata.account_number) || ((_b = metadata === null || metadata === void 0 ? void 0 : metadata.virtual_account) === null || _b === void 0 ? void 0 : _b.account_number) || null;
            if (vaId) {
                wallet = await this.prisma.wallet.findFirst({ where: { paystackVirtualAccountId: vaId } });
            }
            if (!wallet && acct) {
                wallet = await this.prisma.wallet.findFirst({ where: { paystackAccountNumber: acct } });
            }
        }
        catch (err) {
            this.logger.warn('Error resolving wallet for provider deposit', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        if (!wallet) {
            this.logger.warn(`No wallet found for deposit provider=${provider} providerId=${providerId} ref=${reference}`);
            return { found: false };
        }
        const tx = await this.transactions.createTransaction({
            walletId: wallet.id,
            type: 'CREDIT',
            amount: (amount !== null && amount !== void 0 ? amount : 0).toString(),
            reference: txRef,
            status: 'SUCCESS',
            metadata: Object.assign({}, metadata !== null && metadata !== void 0 ? metadata : {}, { provider, providerId, reference }),
        });
        try {
            await this.prisma.auditLog.create({ data: { actorId: null, action: 'provider_deposit_received', entityType: 'Transaction', entityId: tx.id, metadata: { provider, providerId, walletId: wallet.id, reference } } });
            const userId = wallet.userId || null;
            if (userId)
                await this.queue.addNotificationJob('send-notification', { userId, type: 'WALLET_CREDIT', payload: { txId: tx.id, amount } });
        }
        catch (err) {
            this.logger.warn('Failed to audit/notify provider deposit', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        this.logger.log(`Mapped provider deposit to tx ${tx.id} wallet=${wallet.id} reference=${txRef}`);
        return tx;
    }
};
exports.PaymentWebhookService = PaymentWebhookService;
exports.PaymentWebhookService = PaymentWebhookService = PaymentWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactions_service_1.TransactionsService,
        prisma_service_1.PrismaService,
        queue_service_1.QueueService,
        fraud_service_1.FraudService])
], PaymentWebhookService);
//# sourceMappingURL=payment-webhook.service.js.map