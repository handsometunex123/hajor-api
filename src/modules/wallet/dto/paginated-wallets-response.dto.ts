import { ApiProperty } from '@nestjs/swagger';
import { NonProvisionedWalletItemDto } from './non-provisioned-wallet-item.dto';

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

export class PaginatedWalletsResponseDto {
  @ApiProperty({ type: [NonProvisionedWalletItemDto] })
  items!: NonProvisionedWalletItemDto[];

  @ApiProperty({ type: PaginationMeta })
  pagination!: PaginationMeta;
}
