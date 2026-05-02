import { IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateBvnDto {
  @ApiProperty({ description: "User's 11-digit Bank Verification Number", example: '12345678901' })
  @IsString()
  bvn: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Date of birth matching BVN record (YYYY-MM-DD)', example: '1990-01-01' })
  @IsDateString()
  dob: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  phone: string;
}

export class BvnTokenResponseDto {
  @ApiProperty({ description: 'Short-lived token to be passed to the registration or onboarding endpoint. Expires in 5 minutes.', example: 'a3f9c2...' })
  token: string;
}
