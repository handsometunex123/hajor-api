import { ApiProperty } from '@nestjs/swagger';
import { GroupFeedItemDto } from './group-feed-item.dto';

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

export class GroupFeedResponseDto {
  @ApiProperty({ type: [GroupFeedItemDto] })
  data!: GroupFeedItemDto[];

  @ApiProperty({ type: PaginationMeta })
  meta!: PaginationMeta;
}
