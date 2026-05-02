import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Job } from 'bullmq';
import { NotificationsProcessorService } from './notifications-processor.service';
import { PaymentsProcessorService } from './payments-processor.service';
export declare class QueueService implements OnModuleInit, OnModuleDestroy {
    private readonly config;
    private readonly notificationsProcessor;
    private readonly paymentsProcessor;
    private readonly logger;
    private redisConnection;
    paymentsQueue: Queue;
    payoutsQueue: Queue;
    notificationsQueue: Queue;
    reconciliationQueue: Queue;
    private paymentsWorker;
    private payoutsWorker;
    private notificationsWorker;
    private paymentsScheduler;
    private payoutsScheduler;
    private notificationsScheduler;
    private reconciliationScheduler;
    constructor(config: ConfigService, notificationsProcessor: NotificationsProcessorService, paymentsProcessor: PaymentsProcessorService);
    onModuleInit(): Promise<void>;
    addPaymentJob(name: string, data: any, opts?: any): Promise<Job<any, any, string>>;
    scheduleAutoDebit(cycle: {
        id: string;
        contributionDate: string | Date;
    }): Promise<Job<any, any, string>>;
    cancelScheduledPayment(jobId: string): Promise<boolean>;
    addPayoutJob(name: string, data: any, opts?: any): Promise<Job<any, any, string>>;
    addNotificationJob(name: string, data: any, opts?: any): Promise<Job<any, any, string>>;
    triggerReconciliation(): Promise<Job<any, any, string>>;
    onModuleDestroy(): Promise<void>;
}
