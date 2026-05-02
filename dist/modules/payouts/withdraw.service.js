"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WithdrawService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const transactions_service_1 = require("../transactions/transactions.service");
const paystack_service_1 = require("../../infrastructure/paystack/paystack.service");
const queue_service_1 = require("../../infrastructure/queue/queue.service");
const users_service_1 = require("../users/users.service");
let WithdrawService = WithdrawService_1 = class WithdrawService {
    constructor(prisma, transactions, paystack, queue, usersService) {
        this.prisma = prisma;
        this.transactions = transactions;
        this.paystack = paystack;
        this.queue = queue;
        this.usersService = usersService;
        this.logger = new common_1.Logger(WithdrawService_1.name);
        this.OTP_THRESHOLD = Number(process.env.WITHDRAW_OTP_THRESHOLD || '50000');
        this.MAX_SINGLE = Number(process.env.WITHDRAW_MAX_SINGLE || '1000000');
        this.DAILY_LIMIT = Number(process.env.WITHDRAW_DAILY_LIMIT || '5000000');
    }
    async requestWithdraw(userId, amount, recipient, transactionPin, note) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const pinValid = await this.usersService.verifyTransactionPin(userId, transactionPin);
        if (!pinValid)
            throw new common_1.BadRequestException('Invalid transaction PIN');
        const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
        if (!wallet)
            throw new common_1.NotFoundException('Wallet not found for user');
        if (amount <= 0)
            throw new common_1.BadRequestException('Invalid withdraw amount');
        if (amount > this.MAX_SINGLE)
            throw new common_1.BadRequestException('Amount exceeds single-withdraw limit');
        const creditAgg = await this.prisma.transaction.aggregate({ where: { walletId: wallet.id, type: 'CREDIT', status: 'SUCCESS' }, _sum: { amount: true } });
        const debitAgg = await this.prisma.transaction.aggregate({ where: { walletId: wallet.id, type: 'DEBIT', status: 'SUCCESS' }, _sum: { amount: true } });
        const pendingDebitAgg = await this.prisma.transaction.aggregate({ where: { walletId: wallet.id, type: 'DEBIT', status: 'PENDING' }, _sum: { amount: true } });
        const credits = Number((_b = (_a = creditAgg._sum) === null || _a === void 0 ? void 0 : _a.amount) !== null && _b !== void 0 ? _b : 0);
        const debits = Number((_d = (_c = debitAgg._sum) === null || _c === void 0 ? void 0 : _c.amount) !== null && _d !== void 0 ? _d : 0);
        const pendingDebits = Number((_f = (_e = pendingDebitAgg._sum) === null || _e === void 0 ? void 0 : _e.amount) !== null && _f !== void 0 ? _f : 0);
        const available = credits - debits - pendingDebits;
        if (available < amount)
            throw new common_1.BadRequestException('Insufficient available balance');
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayAgg = await this.prisma.transaction.aggregate({ where: { walletId: wallet.id, type: 'DEBIT', createdAt: { gte: startOfDay }, status: { in: ['SUCCESS', 'PENDING'] } }, _sum: { amount: true } });
        const todayTotal = Number((_h = (_g = todayAgg._sum) === null || _g === void 0 ? void 0 : _g.amount) !== null && _h !== void 0 ? _h : 0);
        if (todayTotal + amount > this.DAILY_LIMIT)
            throw new common_1.BadRequestException('Daily withdraw limit exceeded');
        const reference = `withdraw:${wallet.userId}:${Date.now()}`;
        const needsOtp = amount >= this.OTP_THRESHOLD;
        const otp = needsOtp ? Math.floor(100000 + Math.random() * 900000).toString() : undefined;
        const otpExpiresAt = needsOtp ? new Date(Date.now() + 5 * 60 * 1000) : undefined;
        const metadata = { recipient, note, requestedBy: userId };
        if (needsOtp)
            metadata.awaitingOtp = true;
        if (needsOtp && otp)
            metadata.otpHash = await bcrypt.hash(otp, 10);
        if (needsOtp && otpExpiresAt)
            metadata.otpExpiresAt = otpExpiresAt.toISOString();
        const tx = await this.transactions.createTransaction({
            walletId: wallet.id,
            type: 'DEBIT',
            amount: amount.toString(),
            reference,
            status: 'PENDING',
            metadata,
        });
        if (needsOtp) {
            try {
                await this.queue.addNotificationJob('send-otp', {
                    userId,
                    txId: tx.id,
                    otp,
                });
            }
            catch (err) {
                this.logger.warn('Failed to enqueue OTP notification', (err === null || err === void 0 ? void 0 : err.message) || err);
            }
            return { txId: tx.id, status: 'AWAITING_OTP', needsOtp: true };
        }
        try {
            const providerRef = `withdraw:tx:${tx.id}`;
            const res = await this.paystack.initiateTransfer({ recipient, amount, reference: providerRef, reason: note !== null && note !== void 0 ? note : `User withdraw ${userId}` });
            try {
                const oldMeta = (tx.metadata || {});
                await this.prisma.$transaction(async (client) => {
                    var _a, _b, _c, _d;
                    await client.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                    await client.transaction.update({ where: { id: tx.id }, data: { metadata: { ...oldMeta, providerReference: (_d = (_b = (_a = res.data) === null || _a === void 0 ? void 0 : _a.reference) !== null && _b !== void 0 ? _b : (_c = res.data) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : providerRef, providerResponse: res } } });
                });
            }
            catch (err) {
                this.logger.warn('Failed to update transaction with provider reference', (err === null || err === void 0 ? void 0 : err.message) || err);
            }
            return { txId: tx.id, provider_reference: (_m = (_k = (_j = res.data) === null || _j === void 0 ? void 0 : _j.reference) !== null && _k !== void 0 ? _k : (_l = res.data) === null || _l === void 0 ? void 0 : _l.id) !== null && _m !== void 0 ? _m : providerRef, status: 'PENDING' };
        }
        catch (err) {
            this.logger.warn('Provider transfer initiation failed', (err === null || err === void 0 ? void 0 : err.message) || err);
            return { txId: tx.id, status: 'PENDING', error: 'Transfer initiation failed' };
        }
    }
    async confirmWithdraw(userId, txId, otp) {
        var _a, _b, _c, _d, _e;
        const tx = await this.prisma.transaction.findUnique({ where: { id: txId } });
        if (!tx)
            throw new common_1.NotFoundException('Transaction not found');
        if (!tx.walletId)
            throw new common_1.BadRequestException('Transaction not associated with wallet');
        const wallet = await this.prisma.wallet.findUnique({ where: { id: tx.walletId } });
        if (!wallet || wallet.userId !== userId)
            throw new common_1.BadRequestException('Unauthorized');
        const meta = tx.metadata || {};
        if (!meta.awaitingOtp)
            throw new common_1.BadRequestException('Transaction does not require confirmation');
        if (!meta.otpHash)
            throw new common_1.BadRequestException('OTP not found for transaction');
        if (!otp)
            throw new common_1.BadRequestException('OTP required');
        if (!await bcrypt.compare(otp, meta.otpHash))
            throw new common_1.BadRequestException('Invalid OTP');
        if (meta.otpExpiresAt && new Date(meta.otpExpiresAt) < new Date())
            throw new common_1.BadRequestException('OTP expired');
        try {
            const providerRef = `withdraw:tx:${tx.id}`;
            const amt = typeof tx.amount === 'string' ? Number(tx.amount) : Number(tx.amount.toString());
            const res = await this.paystack.initiateTransfer({ recipient: meta.recipient, amount: amt, reference: providerRef, reason: (_a = meta.note) !== null && _a !== void 0 ? _a : `User withdraw ${userId}` });
            const newMeta = { ...meta, awaitingOtp: false, otpHash: undefined, otpExpiresAt: undefined, providerReference: (_e = (_c = (_b = res.data) === null || _b === void 0 ? void 0 : _b.reference) !== null && _c !== void 0 ? _c : (_d = res.data) === null || _d === void 0 ? void 0 : _d.id) !== null && _e !== void 0 ? _e : providerRef, providerResponse: res };
            await this.prisma.$transaction(async (client) => {
                await client.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                await client.transaction.update({ where: { id: tx.id }, data: { metadata: newMeta } });
            });
            return { txId: tx.id, provider_reference: newMeta.providerReference, status: 'PENDING' };
        }
        catch (err) {
            this.logger.warn('Provider transfer initiation failed', (err === null || err === void 0 ? void 0 : err.message) || err);
            return { txId: tx.id, status: 'PENDING', error: 'Transfer initiation failed' };
        }
    }
};
exports.WithdrawService = WithdrawService;
exports.WithdrawService = WithdrawService = WithdrawService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        transactions_service_1.TransactionsService,
        paystack_service_1.PaystackService,
        queue_service_1.QueueService,
        users_service_1.UsersService])
], WithdrawService);
//# sourceMappingURL=withdraw.service.js.map