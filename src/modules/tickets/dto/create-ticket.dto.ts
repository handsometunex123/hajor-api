import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ enum: ['CONTRIBUTOR_REPLACEMENT', 'LEAVE_GROUP'] })
  @IsEnum(['CONTRIBUTOR_REPLACEMENT', 'LEAVE_GROUP'])
  type: 'CONTRIBUTOR_REPLACEMENT' | 'LEAVE_GROUP';

  @ApiProperty()
  @IsUUID()
  groupId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: 'For CONTRIBUTOR_REPLACEMENT: the contributorId to replace', required: false })
  @IsOptional()
  @IsUUID()
  contributorId?: string;

  @ApiProperty({ description: 'For CONTRIBUTOR_REPLACEMENT: the new user to add', required: false })
  @IsOptional()
  @IsUUID()
  newUserId?: string;
}
