import { ApiProperty } from '@nestjs/swagger';
import { UserLiteDto } from './user-lite.dto';

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

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserLiteDto] })
  items!: UserLiteDto[];

  @ApiProperty({ type: PaginationMeta })
  pagination!: PaginationMeta;
}
