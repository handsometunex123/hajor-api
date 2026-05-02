import { QueueService } from './queue.service';
export declare class PaymentQueueService {
    private readonly queue;
    private readonly logger;
    constructor(queue: QueueService);
    scheduleAutoDebit(cycle: {
        id: string;
        contributionDate: string | Date;
    }): Promise<import("bullmq").Job<any, any, string>>;
    enqueueRetryFailed(cycleId: string): Promise<import("bullmq").Job<any, any, string>>;
}
