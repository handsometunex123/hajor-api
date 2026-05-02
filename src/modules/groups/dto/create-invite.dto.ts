import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInviteDto {
  @ApiProperty()
  @IsString()
  userId: string;
}
