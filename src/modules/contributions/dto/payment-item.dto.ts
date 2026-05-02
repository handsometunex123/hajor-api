import { ApiProperty } from '@nestjs/swagger';
import { ContributorLiteDto } from './contributor-lite.dto';

export class PaymentItemDto {
  @ApiProperty()
  paymentId!: string;

  @ApiProperty({ type: ContributorLiteDto })
  contributor!: ContributorLiteDto;
}
