import { Module, Global } from '@nestjs/common';
import { FraudService } from './fraud.service';
import { FraudController } from './fraud.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [FraudService],
  controllers: [FraudController],
  exports: [FraudService],
})
export class FraudModule {}
