import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyContactInviteDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  inviteId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  otp: string;
}
