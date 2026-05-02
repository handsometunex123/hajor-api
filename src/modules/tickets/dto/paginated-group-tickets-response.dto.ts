import { ApiProperty } from '@nestjs/swagger';
import { GroupTicketResponseDto } from './group-ticket-response.dto';

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

export class PaginatedGroupTicketsResponseDto {
  @ApiProperty({ type: [GroupTicketResponseDto] })
  items: GroupTicketResponseDto[];

  @ApiProperty({ type: Pagination })
  pagination: Pagination;
}
