import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CreatePaymentIntentDto } from './payment-intent.dto';
import { PaymentIntentService } from './payment-intent.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { wrapResponse } from '../../common/dto/wrap-response';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PaymentIntentResponseDto } from './dto/payment-intent-response.dto';

@ApiTags('Payments')
@Controller('payments/intents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentIntentController {
  constructor(private service: PaymentIntentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a payment intent to begin checkout' })
  @ApiBody({ type: CreatePaymentIntentDto })
  @ApiResponse({ status: 200, description: 'Payment intent created', type: wrapResponse(PaymentIntentResponseDto) })
  async create(@Body() dto: CreatePaymentIntentDto) {
    return this.service.createIntent(dto.cycleId, dto.groupContributorId, dto.email, dto.callbackUrl);
  }
}
