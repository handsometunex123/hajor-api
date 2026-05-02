import { ApiProperty } from '@nestjs/swagger';

export class RecordPaymentResponseDto {
  @ApiProperty()
  paymentId: string;

  @ApiProperty({ required: false })
  transactionId?: string;
}
