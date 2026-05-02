import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { JsonObject } from '../../common/types/json';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  /**
   * Create a transaction ledger entry idempotently using the provided reference.
   * If a transaction with the same reference exists, it will be returned instead of creating a new one.
   */
  async createTransaction(payload: {
    walletId: string;
    type: 'CREDIT' | 'DEBIT';
    amount: string | number;
    reference: string;
    status?: 'PENDING' | 'SUCCESS' | 'FAILED';
    metadata?: JsonObject;
  }, txClient?: PrismaClient) {
    const { walletId, type, amount, reference, status = 'PENDING', metadata } = payload;

    // idempotency: acquire a short Redis lock for this reference
    const lockKey = `lock:tx:ref:${reference}`;
    const lockTtl = 30; // seconds
    const client = this.redis.getClient();

    const tryAcquire = async () => {
      const ok = await client.setnx(lockKey, '1');
      if (ok === 1) {
        await client.expire(lockKey, lockTtl);
        return true;
      }
      return false;
    };

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    let acquired = await tryAcquire();
    let attempts = 0;
    while (!acquired && attempts < 5) {
      // if lock not acquired, maybe another process is creating the transaction
      // check if transaction already exists to return it
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
      // last attempt to return existing or fail
      const existing = await this.prisma.transaction.findFirst({ where: { reference } });
      if (existing) return existing;
      throw new Error('Could not acquire lock for transaction creation');
    }

    try {
      if (txClient) {
        const existing = await txClient.transaction.findFirst({ where: { reference } });
        if (existing) return existing;

        // Use DB stored procedure to create transaction atomically and enforce DB-level guard
        const metaJson = JSON.stringify(metadata ?? {});
        const rows: unknown = await (txClient as unknown as PrismaClient).$queryRaw`
          SELECT accounting.create_transaction_internal(${walletId}::uuid, ${type}::text, ${Number(amount)}::numeric, ${reference}::text, ${status}::text, ${metaJson}::json) as id
        `;
        const asRecord = (v: unknown) => (v as Record<string, unknown>);
        const id = Array.isArray(rows) ? (asRecord(rows[0]).id ?? rows[0]) : (asRecord(rows).id ?? rows);
        const t = await (txClient as unknown as PrismaClient).transaction.findUnique({ where: { id: id as string } });
        this.logger.log(`Created transaction ${t?.id} reference=${reference}`);
        return t;
      }

      // Non-transactional path: call stored proc via prisma raw query
      const metaJson = JSON.stringify(metadata ?? {});
      const rows: unknown = await (this.prisma as unknown as PrismaClient).$queryRaw`
        SELECT accounting.create_transaction_internal(${walletId}::uuid, ${type}::text, ${Number(amount)}::numeric, ${reference}::text, ${status}::text, ${metaJson}::json) as id
      `;
      const asRecord = (v: unknown) => (v as Record<string, unknown>);
      const id = Array.isArray(rows) ? (asRecord(rows[0]).id ?? rows[0]) : (asRecord(rows).id ?? rows);
      const created = await this.prisma.transaction.findUnique({ where: { id: id as string } });
      this.logger.log(`Created transaction ${created?.id} reference=${reference}`);
      return created;
    } catch (err: any) {
      // Stored procedure not deployed — fall back to direct write with _internal flag (DEV ONLY)
      if (err?.message?.includes('42883')) {
        if (process.env.NODE_ENV === 'production') throw err; // never silently bypass in prod
        this.logger.warn(`Stored proc unavailable, using direct write for reference=${reference}`);
        const doCreate = async (client: any) => {
          await client.$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
          return client.transaction.create({
            data: { walletId, type, amount: Number(amount), reference, status, metadata: metadata ?? {} },
          });
        };
        return txClient ? doCreate(txClient) : this.prisma.$transaction(doCreate);
      }
      // Unique constraint violation when two concurrent creators race.
      if (err?.code === 'P2002' || err?.code === '23505') {
        const existing = await this.prisma.transaction.findFirst({ where: { reference } });
        if (existing) {
          this.logger.debug(`Transaction with reference ${reference} already exists (${existing.id})`);
          return existing;
        }
      }
      throw err;
    } finally {
      try {
        await client.del(lockKey);
      } catch (_) {}
    }

    
  }

  async getByReference(reference: string) {
    return this.prisma.transaction.findFirst({ where: { reference } });
  }

  /**
   * Create a double-entry (debit from one wallet, credit to another) atomically.
   * Returns an object containing `debit` and `credit` transaction ids.
   */
  async createDoubleEntry(payload: {
    fromWalletId: string;
    toWalletId: string;
    amount: string | number;
    reference: string;
    status?: 'PENDING' | 'SUCCESS' | 'FAILED';
    metadata?: JsonObject;
  }, txClient?: PrismaClient) {
    const { fromWalletId, toWalletId, amount, reference, status = 'PENDING', metadata } = payload;

    // idempotency: acquire a short Redis lock for this reference
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

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    let acquired = await tryAcquire();
    let attempts = 0;
    while (!acquired && attempts < 5) {
      const existingCheck = await (txClient ? txClient.transaction.findFirst({ where: { reference } }) : this.prisma.transaction.findFirst({ where: { reference } }));
      if (existingCheck) {
        this.logger.debug(`Transaction with reference ${reference} already exists (${existingCheck.id})`);
        return { existing: existingCheck.id } as any;
      }
      await sleep(100 * (attempts + 1));
      acquired = await tryAcquire();
      attempts++;
    }

    if (!acquired) {
      const existing = await this.prisma.transaction.findFirst({ where: { reference } });
      if (existing) return { existing: existing.id } as any;
      throw new Error('Could not acquire lock for double-entry creation');
    }

    try {
      const metaJson = JSON.stringify(metadata ?? {});
      const asRecord = (v: unknown) => (v as Record<string, unknown>);
      const debitRef  = `${reference}:debit`;
      const creditRef = `${reference}:credit`;
      const db = txClient ? (txClient as unknown as PrismaClient) : (this.prisma as unknown as PrismaClient);

      const debitRows: unknown = await db.$queryRaw`
        SELECT accounting.create_transaction_internal(${fromWalletId}::uuid, 'DEBIT'::text, ${Number(amount)}::numeric, ${debitRef}::text, ${status}::text, ${metaJson}::json) as id
      `;
      const debitId = Array.isArray(debitRows) ? (asRecord(debitRows[0]).id ?? debitRows[0]) : (asRecord(debitRows).id ?? debitRows);

      const creditRows: unknown = await db.$queryRaw`
        SELECT accounting.create_transaction_internal(${toWalletId}::uuid, 'CREDIT'::text, ${Number(amount)}::numeric, ${creditRef}::text, ${status}::text, ${metaJson}::json) as id
      `;
      const creditId = Array.isArray(creditRows) ? (asRecord(creditRows[0]).id ?? creditRows[0]) : (asRecord(creditRows).id ?? creditRows);

      this.logger.log(`Double-entry created debit=${debitId} credit=${creditId} ref=${reference}`);
      return { debit: debitId as string, credit: creditId as string };
    } catch (err: any) {
      // Stored procedure not deployed — fall back to two direct writes with _internal flag (DEV ONLY)
      if (err?.message?.includes('42883')) {
        if (process.env.NODE_ENV === 'production') throw err; // never silently bypass in prod
        this.logger.warn(`Stored proc unavailable, using direct double-entry write for ref=${reference}`);
        const meta = metadata ?? {};
        const debitRef  = `${reference}:debit`;
        const creditRef = `${reference}:credit`;
        const doDoubleCreate = async (client: any) => {
          await client.$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
          const debit  = await client.transaction.create({ data: { walletId: fromWalletId, type: 'DEBIT',  amount: Number(amount), reference: debitRef,  status, metadata: meta } });
          const credit = await client.transaction.create({ data: { walletId: toWalletId,   type: 'CREDIT', amount: Number(amount), reference: creditRef, status, metadata: meta } });
          return { debit: debit.id as string, credit: credit.id as string };
        };
        return txClient ? doDoubleCreate(txClient) : this.prisma.$transaction(doDoubleCreate);
      }
      throw err;
    } finally {
      try {
        await client.del(lockKey);
      } catch (_) {}
    }
  }
}
