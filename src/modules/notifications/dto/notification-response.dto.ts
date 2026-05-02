import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title?: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  isRead: boolean;
}
