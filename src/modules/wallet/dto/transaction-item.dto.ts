import { ApiProperty } from '@nestjs/swagger';

export class TransactionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  reference?: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ required: false })
  metadata?: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: string;
}
