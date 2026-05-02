import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../../modules/transactions/transactions.service';
import { FraudService } from '../../modules/fraud/fraud.service';
interface Queues {
    payments: Queue;
    payouts: Queue;
    notifications: Queue;
}
export declare class PaymentsProcessorService {
    private readonly prisma;
    private readonly transactions;
    private readonly fraud;
    private readonly logger;
    constructor(prisma: PrismaService, transactions: TransactionsService, fraud: FraudService);
    process(job: Job, queues: Queues): Promise<any>;
    private processAutoDebit;
    private processRetryFailed;
    private processGracePeriodReminder;
    private checkCycleCompletion;
}
export {};
