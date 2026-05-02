import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class RequestPhoneVerificationDto {
  @ApiProperty({ description: 'Phone number in international format', example: '+2348012345678' })
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Invalid phone number format' })
  phone: string;
}
