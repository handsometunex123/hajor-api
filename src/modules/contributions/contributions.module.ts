import { Module } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WalletModule } from '../wallet/wallet.module';
import { AuditModule } from '../../common/audit/audit.module';
import { ContributionsController } from './contributions.controller';

@Module({
	imports: [PrismaModule, QueueModule, TransactionsModule, WalletModule, AuditModule],
	providers: [ContributionsService],
	controllers: [ContributionsController],
	exports: [ContributionsService],
})
export class ContributionsModule {}
