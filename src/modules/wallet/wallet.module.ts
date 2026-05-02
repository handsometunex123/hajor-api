import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WalletController } from './wallet.controller';
import { QueueModule } from '../../infrastructure/queue/queue.module';

@Module({
	imports: [PrismaModule, TransactionsModule, QueueModule],
	controllers: [WalletController],
	providers: [WalletService],
	exports: [WalletService],
})
export class WalletModule {}
