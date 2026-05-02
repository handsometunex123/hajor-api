import { Request } from 'express';
import { PaymentWebhookService } from './payment-webhook.service';
import { ProviderChargeDto, ProviderPayoutDto } from './payment-webhook.dto';
import { PaystackService } from '../../infrastructure/paystack/paystack.service';
import { PaystackAdapter } from '../../infrastructure/payments/paystack.adapter';
import { ReconciliationService } from './reconciliation.service';
export declare class PaymentWebhookController {
    private readonly webhook;
    private readonly paystack;
    private readonly adapter;
    private readonly recon;
    private readonly logger;
    constructor(webhook: PaymentWebhookService, paystack: PaystackService, adapter: PaystackAdapter, recon: ReconciliationService);
    charge(req: Request, headers: any, body: ProviderChargeDto): Promise<{
        ok: boolean;
        txId: any;
    }>;
    confirm(req: Request, headers: any, body: any): Promise<{
        found: boolean;
        ok?: undefined;
        txId?: undefined;
    } | {
        ok: boolean;
        txId: string;
        found?: undefined;
    }>;
    payout(req: Request, headers: any, body: ProviderPayoutDto): Promise<{
        ok: boolean;
        txId: any;
    }>;
    paystackWebhook(req: Request, headers: any, body: any): Promise<any>;
    adminReconcile(): Promise<{
        checked: number;
    }>;
}
