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
var TransactionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const redis_service_1 = require("../../infrastructure/redis/redis.service");
let TransactionsService = TransactionsService_1 = class TransactionsService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
        this.logger = new common_1.Logger(TransactionsService_1.name);
    }
    async createTransaction(payload, txClient) {
        var _a, _b, _c, _d, _e;
        const { walletId, type, amount, reference, status = 'PENDING', metadata } = payload;
        const lockKey = `lock:tx:ref:${reference}`;
        const lockTtl = 30;
        const client = this.redis.getClient();
        const tryAcquire = async () => {
            const ok = await client.setnx(lockKey, '1');
            if (ok === 1) {
                await client.expire(lockKey, lockTtl);
                return true;
            }
            return false;
        };
        const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
        let acquired = await tryAcquire();
        let attempts = 0;
        while (!acquired && attempts < 5) {
            const existingCheck = await (txClient ? txClient.transaction.findFirst({ where: { reference } }) : this.prisma.transaction.findFirst({ where: { reference } }));
            if (existingCheck) {
                this.logger.debug(`Transaction with reference ${reference} already exists (${existingCheck.id})`);
                return existingCheck;
            }
            await sleep(100 * (attempts + 1));
            acquired = await tryAcquire();
            attempts++;
        }
        if (!acquired) {
            const existing = await this.prisma.transaction.findFirst({ where: { reference } });
            if (existing)
                return existing;
            throw new Error('Could not acquire lock for transaction creation');
        }
        try {
            if (txClient) {
                const existing = await txClient.transaction.findFirst({ where: { reference } });
                if (existing)
                    return existing;
                const metaJson = JSON.stringify(metadata !== null && metadata !== void 0 ? metadata : {});
                const rows = await txClient.$queryRaw `
          SELECT accounting.create_transaction_internal(${walletId}::uuid, ${type}::text, ${Number(amount)}::numeric, ${reference}::text, ${status}::text, ${metaJson}::json) as id
        `;
                const asRecord = (v) => v;
                const id = Array.isArray(rows) ? ((_a = asRecord(rows[0]).id) !== null && _a !== void 0 ? _a : rows[0]) : ((_b = asRecord(rows).id) !== null && _b !== void 0 ? _b : rows);
                const t = await txClient.transaction.findUnique({ where: { id: id } });
                this.logger.log(`Created transaction ${t === null || t === void 0 ? void 0 : t.id} reference=${reference}`);
                return t;
            }
            const metaJson = JSON.stringify(metadata !== null && metadata !== void 0 ? metadata : {});
            const rows = await this.prisma.$queryRaw `
        SELECT accounting.create_transaction_internal(${walletId}::uuid, ${type}::text, ${Number(amount)}::numeric, ${reference}::text, ${status}::text, ${metaJson}::json) as id
      `;
            const asRecord = (v) => v;
            const id = Array.isArray(rows) ? ((_c = asRecord(rows[0]).id) !== null && _c !== void 0 ? _c : rows[0]) : ((_d = asRecord(rows).id) !== null && _d !== void 0 ? _d : rows);
            const created = await this.prisma.transaction.findUnique({ where: { id: id } });
            this.logger.log(`Created transaction ${created === null || created === void 0 ? void 0 : created.id} reference=${reference}`);
            return created;
        }
        catch (err) {
            if ((_e = err === null || err === void 0 ? void 0 : err.message) === null || _e === void 0 ? void 0 : _e.includes('42883')) {
                if (process.env.NODE_ENV === 'production')
                    throw err;
                this.logger.warn(`Stored proc unavailable, using direct write for reference=${reference}`);
                const doCreate = async (client) => {
                    await client.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                    return client.transaction.create({
                        data: { walletId, type, amount: Number(amount), reference, status, metadata: metadata !== null && metadata !== void 0 ? metadata : {} },
                    });
                };
                return txClient ? doCreate(txClient) : this.prisma.$transaction(doCreate);
            }
            if ((err === null || err === void 0 ? void 0 : err.code) === 'P2002' || (err === null || err === void 0 ? void 0 : err.code) === '23505') {
                const existing = await this.prisma.transaction.findFirst({ where: { reference } });
                if (existing) {
                    this.logger.debug(`Transaction with reference ${reference} already exists (${existing.id})`);
                    return existing;
                }
            }
            throw err;
        }
        finally {
            try {
                await client.del(lockKey);
            }
            catch (_) { }
        }
    }
    async getByReference(reference) {
        return this.prisma.transaction.findFirst({ where: { reference } });
    }
    async createDoubleEntry(payload, txClient) {
        var _a, _b, _c, _d, _e;
        const { fromWalletId, toWalletId, amount, reference, status = 'PENDING', metadata } = payload;
        const lockKey = `lock:tx:double:ref:${reference}`;
        const lockTtl = 30;
        const client = this.redis.getClient();
        const tryAcquire = async () => {
            const ok = await client.setnx(lockKey, '1');
            if (ok === 1) {
                await client.expire(lockKey, lockTtl);
                return true;
            }
            return false;
        };
        const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
        let acquired = await tryAcquire();
        let attempts = 0;
        while (!acquired && attempts < 5) {
            const existingCheck = await (txClient ? txClient.transaction.findFirst({ where: { reference } }) : this.prisma.transaction.findFirst({ where: { reference } }));
            if (existingCheck) {
                this.logger.debug(`Transaction with reference ${reference} already exists (${existingCheck.id})`);
                return { existing: existingCheck.id };
            }
            await sleep(100 * (attempts + 1));
            acquired = await tryAcquire();
            attempts++;
        }
        if (!acquired) {
            const existing = await this.prisma.transaction.findFirst({ where: { reference } });
            if (existing)
                return { existing: existing.id };
            throw new Error('Could not acquire lock for double-entry creation');
        }
        try {
            const metaJson = JSON.stringify(metadata !== null && metadata !== void 0 ? metadata : {});
            const asRecord = (v) => v;
            const debitRef = `${reference}:debit`;
            const creditRef = `${reference}:credit`;
            const db = txClient ? txClient : this.prisma;
            const debitRows = await db.$queryRaw `
        SELECT accounting.create_transaction_internal(${fromWalletId}::uuid, 'DEBIT'::text, ${Number(amount)}::numeric, ${debitRef}::text, ${status}::text, ${metaJson}::json) as id
      `;
            const debitId = Array.isArray(debitRows) ? ((_a = asRecord(debitRows[0]).id) !== null && _a !== void 0 ? _a : debitRows[0]) : ((_b = asRecord(debitRows).id) !== null && _b !== void 0 ? _b : debitRows);
            const creditRows = await db.$queryRaw `
        SELECT accounting.create_transaction_internal(${toWalletId}::uuid, 'CREDIT'::text, ${Number(amount)}::numeric, ${creditRef}::text, ${status}::text, ${metaJson}::json) as id
      `;
            const creditId = Array.isArray(creditRows) ? ((_c = asRecord(creditRows[0]).id) !== null && _c !== void 0 ? _c : creditRows[0]) : ((_d = asRecord(creditRows).id) !== null && _d !== void 0 ? _d : creditRows);
            this.logger.log(`Double-entry created debit=${debitId} credit=${creditId} ref=${reference}`);
            return { debit: debitId, credit: creditId };
        }
        catch (err) {
            if ((_e = err === null || err === void 0 ? void 0 : err.message) === null || _e === void 0 ? void 0 : _e.includes('42883')) {
                if (process.env.NODE_ENV === 'production')
                    throw err;
                this.logger.warn(`Stored proc unavailable, using direct double-entry write for ref=${reference}`);
                const meta = metadata !== null && metadata !== void 0 ? metadata : {};
                const debitRef = `${reference}:debit`;
                const creditRef = `${reference}:credit`;
                const doDoubleCreate = async (client) => {
                    await client.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                    const debit = await client.transaction.create({ data: { walletId: fromWalletId, type: 'DEBIT', amount: Number(amount), reference: debitRef, status, metadata: meta } });
                    const credit = await client.transaction.create({ data: { walletId: toWalletId, type: 'CREDIT', amount: Number(amount), reference: creditRef, status, metadata: meta } });
                    return { debit: debit.id, credit: credit.id };
                };
                return txClient ? doDoubleCreate(txClient) : this.prisma.$transaction(doDoubleCreate);
            }
            throw err;
        }
        finally {
            try {
                await client.del(lockKey);
            }
            catch (_) { }
        }
    }
};
exports.TransactionsService = TransactionsService;
exports.TransactionsService = TransactionsService = TransactionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, redis_service_1.RedisService])
], TransactionsService);
//# sourceMappingURL=transactions.service.js.map