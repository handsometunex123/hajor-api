import { CreatePaymentIntentDto } from './payment-intent.dto';
import { PaymentIntentService } from './payment-intent.service';
export declare class PaymentIntentController {
    private service;
    constructor(service: PaymentIntentService);
    create(dto: CreatePaymentIntentDto): Promise<{
        authorization_url: any;
        provider_reference: any;
        transaction: any;
    }>;
}
