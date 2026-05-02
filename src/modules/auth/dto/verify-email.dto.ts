import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: '6-digit OTP sent to your email', example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string;
}
