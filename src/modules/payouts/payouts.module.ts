import { Module } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { PayoutsController } from './payouts.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { PaymentWebhookController } from '../payments/payment-webhook.controller';
import { PaymentWebhookService } from '../payments/payment-webhook.service';
import { PaymentIntentController } from '../payments/payment-intent.controller';
import { PaymentIntentService } from '../payments/payment-intent.service';
import { WithdrawController } from './withdraw.controller';
import { WithdrawService } from './withdraw.service';
import { PaystackService } from '../../infrastructure/paystack/paystack.service';
import { PaystackAdapter } from '../../infrastructure/payments/paystack.adapter';
import { ReconciliationService } from '../payments/reconciliation.service';
import { UsersModule } from '../users/users.module';

@Module({
	imports: [PrismaModule, QueueModule, TransactionsModule, UsersModule],
	providers: [PayoutsService, PaymentWebhookService, PaystackService, PaystackAdapter, ReconciliationService, PaymentIntentService, WithdrawService],
	controllers: [PayoutsController, PaymentWebhookController, PaymentIntentController, WithdrawController],
	exports: [PayoutsService],
})
export class PayoutsModule {}
