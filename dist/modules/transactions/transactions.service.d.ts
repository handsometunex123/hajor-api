import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { JsonObject } from '../../common/types/json';
import { PrismaClient } from '@prisma/client';
export declare class TransactionsService {
    private readonly prisma;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService);
    createTransaction(payload: {
        walletId: string;
        type: 'CREDIT' | 'DEBIT';
        amount: string | number;
        reference: string;
        status?: 'PENDING' | 'SUCCESS' | 'FAILED';
        metadata?: JsonObject;
    }, txClient?: PrismaClient): Promise<any>;
    getByReference(reference: string): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        walletId: string;
        type: import(".prisma/client").TransactionType;
        amount: import("@prisma/client/runtime").Decimal;
        reference: string;
        status: import(".prisma/client").TransactionStatus;
        metadata: import(".prisma/client").Prisma.JsonValue | null;
        createdAt: Date;
        deletedAt: Date | null;
    }, unknown> & {}>;
    createDoubleEntry(payload: {
        fromWalletId: string;
        toWalletId: string;
        amount: string | number;
        reference: string;
        status?: 'PENDING' | 'SUCCESS' | 'FAILED';
        metadata?: JsonObject;
    }, txClient?: PrismaClient): Promise<any>;
}
