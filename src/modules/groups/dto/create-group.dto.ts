import { IsString, IsInt, Min, Max, MaxLength, IsOptional, IsNumber, IsIn, IsBoolean, Equals } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Frequency } from '../../../common/enums';

export class CreateGroupDto {
  @ApiProperty({ maxLength: 100, example: 'My Savings Group' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ maxLength: 1000, example: 'A short description of the group' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ minimum: 2, example: 10 })
  @IsInt()
  @Min(2)
  maxSlots: number;

  @ApiProperty({ minimum: 0, example: 5000 })
  @IsNumber()
  @Min(0)
  contributionAmount: number;

  @ApiProperty({ enum: Frequency, example: Frequency.WEEKLY })
  @IsString()
  @IsIn([Frequency.WEEKLY, Frequency.MONTHLY])
  frequency: Frequency;

  @ApiPropertyOptional({ minimum: 0, example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  serviceCharge?: number;

  @ApiPropertyOptional({ minimum: 0, example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  lateFee?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 7, description: 'Grace period in days before defaulting unpaid contributions (default: 1)', example: 2 })
  @IsInt()
  @Min(1)
  @Max(7)
  @IsOptional()
  gracePeriodDays?: number;

  @ApiProperty({ description: 'Admin must accept the platform indemnity and terms to create a group', example: true })
  @IsBoolean()
  @Equals(true, { message: 'Admin must accept the platform indemnity and terms' })
  adminIndemnityAccepted: boolean;
}
