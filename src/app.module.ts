import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditModule } from './common/audit/audit.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { GroupsModule } from './modules/groups/groups.module';
import { ContributionsModule } from './modules/contributions/contributions.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { ChatModule } from './modules/chat/chat.module';
import { TicketModule } from './modules/tickets/ticket.module';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/jwt.guard';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { MaintenanceModule } from './infrastructure/maintenance/maintenance.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { MonitoringModule } from './infrastructure/monitoring/monitoring.module';
import { RedisThrottlerStorage } from './infrastructure/throttler/redis-throttler-storage';

@Module({
  imports: [
    HealthModule,
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    RedisModule,
    MonitoringModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        throttlers: [
          {
            ttl: parseInt(config.get<string>('RATE_TTL', '60')),
            limit: parseInt(config.get<string>('RATE_LIMIT', '100')),
          },
        ],
      }),
    }),
    AuditModule,
    PrismaModule,
    MaintenanceModule,
    QueueModule,
    AuthModule,
    UsersModule,
    WalletModule,
    TransactionsModule,
    GroupsModule,
    ContributionsModule,
    PayoutsModule,
    FraudModule,
    NotificationsModule,
    DisputesModule,
    ChatModule,
    TicketModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: ThrottlerStorage,
      useClass: RedisThrottlerStorage,
    },
  ],
})
export class AppModule {}
