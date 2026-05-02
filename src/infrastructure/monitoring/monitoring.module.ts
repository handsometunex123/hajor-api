import { Global, Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
