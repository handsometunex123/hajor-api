import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PurgeService } from './purge.service';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [PurgeService],
  exports: [],
})
export class MaintenanceModule {}
