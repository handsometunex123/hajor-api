import { Module } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { DisputesController } from './disputes.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
	imports: [PrismaModule, NotificationsModule],
	providers: [DisputesService],
	controllers: [DisputesController],
	exports: [DisputesService],
})
export class DisputesModule {}
