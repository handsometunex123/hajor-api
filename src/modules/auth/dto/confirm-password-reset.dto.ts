import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmPasswordResetDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP sent to the user' })
  @IsString()
  otp: string;

  @ApiProperty({ example: 'NewP@ssw0rd', description: 'New password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
