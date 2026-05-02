import { TransactionsService } from '../transactions/transactions.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { FraudService } from '../fraud/fraud.service';
export declare class PaymentWebhookService {
    private readonly transactions;
    private readonly prisma;
    private readonly queue;
    private readonly fraud;
    private readonly logger;
    constructor(transactions: TransactionsService, prisma: PrismaService, queue: QueueService, fraud: FraudService);
    handleProviderCharge(payload: {
        provider: string;
        providerId: string;
        walletOwnerId: string;
        reference: string;
        amount: number;
        metadata?: any;
    }): Promise<any>;
    handleProviderPayout(payload: {
        provider: string;
        providerId: string;
        reference: string;
        amount: number;
        metadata?: any;
    }): Promise<any>;
    confirmProviderCharge(payload: {
        provider: string;
        providerId: string;
        reference: string;
        amount?: number;
        providerStatus?: string;
    }): Promise<{
        found: boolean;
        ok?: undefined;
        txId?: undefined;
        paymentUpdated?: undefined;
    } | {
        ok: boolean;
        txId: string;
        paymentUpdated: boolean;
        found?: undefined;
    }>;
    confirmProviderTransfer(payload: {
        provider: string;
        providerId: string;
        reference: string;
        amount?: number;
        providerStatus?: string;
    }): Promise<{
        found: boolean;
        ok?: undefined;
        txId?: undefined;
    } | {
        ok: boolean;
        txId: string;
        found?: undefined;
    }>;
    handleProviderDeposit(payload: {
        provider: string;
        providerId: string;
        reference?: string;
        amount: number;
        metadata?: any;
    }): Promise<any>;
}
