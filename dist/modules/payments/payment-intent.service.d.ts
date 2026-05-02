import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { PaystackService } from '../../infrastructure/paystack/paystack.service';
export declare class PaymentIntentService {
    private prisma;
    private transactions;
    private paystack;
    constructor(prisma: PrismaService, transactions: TransactionsService, paystack: PaystackService);
    createIntent(cycleId: string, groupContributorId: string, email: string, callbackUrl?: string): Promise<{
        authorization_url: any;
        provider_reference: any;
        transaction: any;
    }>;
}
