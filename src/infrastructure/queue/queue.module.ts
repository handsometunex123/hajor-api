import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueService } from './queue.service';
import { PaymentQueueService } from './payment-queue.service';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationsProcessorService } from './notifications-processor.service';
import { PaymentsProcessorService } from './payments-processor.service';
import { TransactionsModule } from '../../modules/transactions/transactions.module';

@Global()
@Module({
  imports: [ConfigModule, TransactionsModule],
  providers: [QueueService, PaymentQueueService, NotificationQueueService, NotificationsProcessorService, PaymentsProcessorService],
  exports: [QueueService, PaymentQueueService, NotificationQueueService, NotificationsProcessorService, PaymentsProcessorService],
})
export class QueueModule {}
