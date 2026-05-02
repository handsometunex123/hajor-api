import { ApiProperty } from '@nestjs/swagger';
import { MessageResponseDto } from './message-response.dto';

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

export class MessagesListResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  data: MessageResponseDto[];

  @ApiProperty({ type: Pagination })
  pagination: Pagination;
}
