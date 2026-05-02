import { ApiProperty } from '@nestjs/swagger';

export class PaymentIntentResponseDto {
  @ApiProperty()
  intentId: string;

  @ApiProperty()
  checkoutUrl: string;
}
