import { IsString, IsOptional, IsNumberString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OnboardInviteDto {
  @ApiProperty({ description: 'One-time registration token from the invite email' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Password to set for the new account', format: 'password' })
  @IsString()
  password: string;

  @ApiProperty({ description: '6-digit transaction PIN', example: '123456' })
  @IsNumberString()
  @Length(6, 6)
  transactionPin: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  phone: string;

  @ApiProperty({ description: "User's Bank Verification Number", example: '12345678901' })
  @IsString()
  bvn: string;

  @ApiProperty({ description: 'BVN validation token obtained from the BVN pre-validation endpoint' })
  @IsString()
  bvnValidationToken: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiPropertyOptional({ example: '12 Lagos Street, Abuja' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'URL of uploaded utility bill for address verification' })
  @IsOptional()
  @IsString()
  utilityBillUrl?: string;
}
