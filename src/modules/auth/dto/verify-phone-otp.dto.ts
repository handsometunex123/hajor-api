import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class VerifyPhoneOtpDto {
  @ApiProperty({ description: 'Phone number in international format', example: '+2348012345678' })
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiProperty({ description: '6-digit OTP received via SMS', example: '482913' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}
