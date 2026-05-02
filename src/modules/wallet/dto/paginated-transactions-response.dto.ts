import { ApiProperty } from '@nestjs/swagger';
import { TransactionItemDto } from './transaction-item.dto';

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

export class PaginatedTransactionsResponseDto {
  @ApiProperty({ type: [TransactionItemDto] })
  items!: TransactionItemDto[];

  @ApiProperty({ type: PaginationMeta })
  pagination!: PaginationMeta;
}
