import { ApiProperty } from '@nestjs/swagger';
import { PaymentItemDto } from './payment-item.dto';

export class ContributionCycleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  groupId!: string;

  @ApiProperty()
  cycleNumber!: number;

  @ApiProperty()
  contributionDate!: string;

  @ApiProperty()
  payoutDate!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: [PaymentItemDto], required: false })
  payments?: PaymentItemDto[];
}
