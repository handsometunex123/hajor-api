import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class VerifyBvnDto {
  @ApiProperty({ description: 'Bank Verification Number (BVN)', example: '12345678901' })
  @IsString()
  bvn: string;

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)', example: '1990-01-01' })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+2348012345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'First name', example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;
}
