import { ApiProperty } from '@nestjs/swagger';
import { PaymentItemDto } from './payment-item.dto';

class PaginationMeta {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  pages!: number;
}

export class DefaulterListResponseDto {
  @ApiProperty({ type: [PaymentItemDto] })
  items!: PaymentItemDto[];

  @ApiProperty({ type: PaginationMeta })
  meta!: PaginationMeta;
}
