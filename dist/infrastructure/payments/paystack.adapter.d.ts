import { ProviderAdapter, ProviderAdapterEvent } from './provider-adapter.interface';
import { PaystackService } from '../paystack/paystack.service';
import { PaymentWebhookService } from '../../modules/payments/payment-webhook.service';
export declare class PaystackAdapter implements ProviderAdapter {
    private readonly paystack;
    private readonly webhook;
    private readonly logger;
    constructor(paystack: PaystackService, webhook: PaymentWebhookService);
    verifySignature(rawBody: string, signatureHeader?: string): boolean;
    handleEvent(evt: ProviderAdapterEvent): Promise<any>;
}
