import { ApiProperty } from '@nestjs/swagger';

class TicketGroupBasic {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class UserTicketResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  groupId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty({ required: false })
  contributorId?: string;

  @ApiProperty({ required: false })
  newUserId?: string;

  @ApiProperty({ required: false })
  adminNotes?: string;

  @ApiProperty({ required: false })
  resolvedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: TicketGroupBasic })
  group: TicketGroupBasic;
}
