import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { Prisma } from '@prisma/client';
export declare class WalletService {
    private readonly prisma;
    private readonly queueService;
    private readonly logger;
    constructor(prisma: PrismaService, queueService: QueueService);
    getBalance(walletId: string): Promise<string>;
    getWalletByUser(userId: string): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        userId: string | null;
        groupId: string | null;
        paystackVirtualAccountId: string | null;
        paystackAccountNumber: string | null;
        paystackBank: string | null;
        paystackMeta: Prisma.JsonValue | null;
        paystackProvisionStatus: string | null;
        paystackProvisionAttempts: number;
        paystackProvisionedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }, unknown> & {}>;
    getWalletByGroup(groupId: string): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        userId: string | null;
        groupId: string | null;
        paystackVirtualAccountId: string | null;
        paystackAccountNumber: string | null;
        paystackBank: string | null;
        paystackMeta: Prisma.JsonValue | null;
        paystackProvisionStatus: string | null;
        paystackProvisionAttempts: number;
        paystackProvisionedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }, unknown> & {}>;
    getTransactions(walletId: string, opts?: {
        page?: number;
        limit?: number;
        type?: string;
        status?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        items: {
            id: string;
            type: import(".prisma/client").TransactionType;
            amount: string;
            reference: string;
            status: import(".prisma/client").TransactionStatus;
            metadata: Prisma.JsonValue;
            createdAt: Date;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    listNonProvisioned(opts?: {
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        items: {
            id: string;
            userId: string;
            provisionStatus: string;
            attempts: any;
            provisionedAt: any;
            user: {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
            };
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    triggerProvision(walletId: string): Promise<{
        ok: boolean;
        walletId: string;
    }>;
    devProvisionAll(): Promise<{
        provisioned: number;
        walletIds: string[];
    }>;
    devFundWallet(userId: string, amount: number): Promise<{
        walletId: string;
        credited: number;
        newBalance: string;
    }>;
}
