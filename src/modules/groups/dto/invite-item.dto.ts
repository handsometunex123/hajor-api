import { ApiProperty } from '@nestjs/swagger';

class UserLiteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false })
  firstName?: string;

  @ApiProperty({ required: false })
  lastName?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  phone?: string;
}

export class InviteItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: UserLiteDto, required: false })
  user?: UserLiteDto | null;

  @ApiProperty({ type: UserLiteDto, required: false })
  invitedBy?: UserLiteDto | null;

  @ApiProperty({ required: false })
  metadata?: Record<string, unknown> | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: string;
}
