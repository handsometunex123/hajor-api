import { ApiProperty } from '@nestjs/swagger';

class TicketUser {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;
}

class TicketGroup {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  adminId: string;
}

export class TicketDetailResponseDto {
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

  @ApiProperty({ type: TicketUser })
  user: TicketUser;

  @ApiProperty({ type: TicketGroup })
  group: TicketGroup;
}
