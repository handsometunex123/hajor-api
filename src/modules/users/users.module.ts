import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { UsersController } from './users.controller';
import { ConfigModule } from '@nestjs/config';
import { KycService } from './kyc.service';
import { FraudModule } from '../fraud/fraud.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';

@Module({
  imports: [PrismaModule, ConfigModule, FraudModule, QueueModule],
  providers: [UsersService, KycService],
  controllers: [UsersController],
  exports: [UsersService, KycService],
})
export class UsersModule {}
