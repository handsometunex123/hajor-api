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
var WalletService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const queue_service_1 = require("../../infrastructure/queue/queue.service");
const client_1 = require("@prisma/client");
let WalletService = WalletService_1 = class WalletService {
    constructor(prisma, queueService) {
        this.prisma = prisma;
        this.queueService = queueService;
        this.logger = new common_1.Logger(WalletService_1.name);
    }
    async getBalance(walletId) {
        const credit = await this.prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { walletId, type: 'CREDIT', status: 'SUCCESS' },
        });
        const debit = await this.prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { walletId, type: 'DEBIT', status: 'SUCCESS' },
        });
        const creditSum = credit._sum.amount ? credit._sum.amount.toString() : '0';
        const debitSum = debit._sum.amount ? debit._sum.amount.toString() : '0';
        try {
            const result = new client_1.Prisma.Decimal(creditSum).minus(new client_1.Prisma.Decimal(debitSum));
            return result.toFixed(2);
        }
        catch (err) {
            const c = parseFloat(creditSum);
            const d = parseFloat(debitSum);
            return (Number.isNaN(c) || Number.isNaN(d) ? 0 : c - d).toFixed(2);
        }
    }
    async getWalletByUser(userId) {
        return this.prisma.wallet.findUnique({ where: { userId } });
    }
    async getWalletByGroup(groupId) {
        return this.prisma.wallet.findUnique({ where: { groupId } });
    }
    async getTransactions(walletId, opts = {}) {
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 20;
        const skip = (page - 1) * limit;
        const allowedSortFields = ['createdAt', 'amount', 'type', 'status'];
        const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
        const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';
        const where = { walletId };
        if (opts.type)
            where.type = opts.type;
        if (opts.status)
            where.status = opts.status;
        const [txs, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                select: { id: true, type: true, amount: true, reference: true, status: true, metadata: true, createdAt: true },
            }),
            this.prisma.transaction.count({ where }),
        ]);
        const data = txs.map((t) => ({
            id: t.id,
            type: t.type,
            amount: t.amount ? t.amount.toString() : '0',
            reference: t.reference,
            status: t.status,
            metadata: t.metadata,
            createdAt: t.createdAt,
        }));
        return {
            items: data,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit) || 1,
            },
        };
    }
    async listNonProvisioned(opts = {}) {
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 200) : 50;
        const skip = (page - 1) * limit;
        const allowedSortFields = ['createdAt'];
        const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
        const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';
        const [rows, total] = await Promise.all([
            this.prisma.wallet.findMany({ where: { OR: [{ paystackProvisionStatus: null }, { paystackProvisionStatus: { not: 'PROVISIONED' } }] }, include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
            this.prisma.wallet.count({ where: { OR: [{ paystackProvisionStatus: null }, { paystackProvisionStatus: { not: 'PROVISIONED' } }] } }),
        ]);
        const data = rows.map((w) => ({ id: w.id, userId: w.userId, provisionStatus: w.paystackProvisionStatus, attempts: w.paystackProvisionAttempts || 0, provisionedAt: w.paystackProvisionedAt || null, user: w.user }));
        return { items: data, pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } };
    }
    async triggerProvision(walletId) {
        const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId }, include: { user: true } });
        if (!wallet)
            throw new Error('Wallet not found');
        const user = wallet.user;
        const name = user ? `${user.firstName} ${user.lastName}` : undefined;
        const email = (user === null || user === void 0 ? void 0 : user.email) || undefined;
        await this.queueService.addNotificationJob('provision-virtual-account', { walletId: wallet.id, name, email }, { attempts: 10, backoff: { type: 'exponential', delay: 3000 }, removeOnFail: false });
        return { ok: true, walletId: wallet.id };
    }
    async devProvisionAll() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('devProvisionAll is not available in production');
        }
        const fakeBanks = ['Wema Bank', 'Sterling Bank', 'Providus Bank', 'Titan Trust Bank'];
        const stuck = await this.prisma.wallet.findMany({
            where: { OR: [{ paystackProvisionStatus: null }, { paystackProvisionStatus: { not: 'PROVISIONED' } }] },
            select: { id: true },
        });
        const walletIds = [];
        for (const w of stuck) {
            const fakeAccountNumber = String(Math.floor(1000000000 + Math.random() * 9000000000));
            const fakeBank = fakeBanks[Math.floor(Math.random() * fakeBanks.length)];
            await this.prisma.$transaction(async (tx) => {
                await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                await tx.wallet.update({
                    where: { id: w.id },
                    data: {
                        paystackVirtualAccountId: `dev_va_${Date.now()}_${w.id.slice(0, 8)}`,
                        paystackAccountNumber: fakeAccountNumber,
                        paystackBank: fakeBank,
                        paystackMeta: { dev: true, account_number: fakeAccountNumber, bank: fakeBank },
                        paystackProvisionStatus: 'PROVISIONED',
                        paystackProvisionedAt: new Date(),
                    },
                });
            });
            walletIds.push(w.id);
        }
        return { provisioned: walletIds.length, walletIds };
    }
    async devFundWallet(userId, amount) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('devFundWallet is not available in production');
        }
        const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
        if (!wallet)
            throw new Error(`No wallet found for userId ${userId}`);
        await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
            await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'CREDIT',
                    amount: amount,
                    reference: `dev-fund:${wallet.id}:${Date.now()}`,
                    status: 'SUCCESS',
                    metadata: { source: 'dev-fund' },
                },
            });
        });
        const newBalance = await this.getBalance(wallet.id);
        return { walletId: wallet.id, credited: amount, newBalance };
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = WalletService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        queue_service_1.QueueService])
], WalletService);
//# sourceMappingURL=wallet.service.js.map