import { ApiProperty } from '@nestjs/swagger';
import { InviteItemDto } from './invite-item.dto';

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

export class InviteListResponseDto {
  @ApiProperty({ type: [InviteItemDto] })
  items!: InviteItemDto[];

  @ApiProperty({ type: PaginationMeta })
  pagination!: PaginationMeta;
}
