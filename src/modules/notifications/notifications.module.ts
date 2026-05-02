import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { QueueModule } from '../../infrastructure/queue/queue.module';

@Module({
  imports: [PrismaModule, QueueModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
