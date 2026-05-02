import { ApiProperty } from '@nestjs/swagger';
import { UserTicketResponseDto } from './user-ticket-response.dto';

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

export class PaginatedUserTicketsResponseDto {
  @ApiProperty({ type: [UserTicketResponseDto] })
  items: UserTicketResponseDto[];

  @ApiProperty({ type: Pagination })
  pagination: Pagination;
}
