import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { TransactionsService } from '../transactions/transactions.service';
export declare class PayoutsService {
    private readonly prisma;
    private readonly queue;
    private readonly transactions;
    private readonly logger;
    constructor(prisma: PrismaService, queue: QueueService, transactions: TransactionsService);
    executeCyclePayout(cycleId: string): Promise<{
        payoutTxId: any;
    } | {
        skipped: boolean;
        txId: string;
    }>;
    checkGroupCompletion(groupId: string): Promise<void>;
}
