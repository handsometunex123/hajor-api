import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaystackService } from '../../infrastructure/paystack/paystack.service';
import { PaymentWebhookService } from './payment-webhook.service';
export declare class ReconciliationService {
    private readonly prisma;
    private readonly paystack;
    private readonly webhook;
    private readonly logger;
    constructor(prisma: PrismaService, paystack: PaystackService, webhook: PaymentWebhookService);
    reconcilePending(limit?: number): Promise<{
        checked: number;
    }>;
}
