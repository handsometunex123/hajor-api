import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { TransactionsController } from './transactions.controller';

@Module({
	imports: [PrismaModule],
	providers: [TransactionsService],
	controllers: [TransactionsController],
	exports: [TransactionsService],
})
export class TransactionsModule {}
