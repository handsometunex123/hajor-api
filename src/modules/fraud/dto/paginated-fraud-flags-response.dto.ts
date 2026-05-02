import { ApiProperty } from '@nestjs/swagger';
import { FraudFlagResponseDto } from './fraud-flag-response.dto';

class Pagination {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  pages: number;
}

export class PaginatedFraudFlagsResponseDto {
  @ApiProperty({ type: [FraudFlagResponseDto] })
  items: FraudFlagResponseDto[];

  @ApiProperty({ type: Pagination })
  pagination: Pagination;
}
