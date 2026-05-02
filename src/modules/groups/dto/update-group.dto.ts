import { IsString, IsInt, Min, MaxLength, IsOptional, IsNumber, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Frequency } from '../../../common/enums';

export class UpdateGroupDto {
  // --- Trivial fields (editable anytime by admin) ---

  @ApiPropertyOptional({ maxLength: 100, example: 'My Savings Group' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ maxLength: 1000, example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // Removed group-specific terms; platform-wide terms enforced

  // --- Core fields (only editable before group starts) ---

  @ApiPropertyOptional({ minimum: 0, example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  contributionAmount?: number;

  @ApiPropertyOptional({ enum: Frequency, example: Frequency.WEEKLY })
  @IsOptional()
  @IsString()
  @IsIn([Frequency.WEEKLY, Frequency.MONTHLY])
  frequency?: Frequency;

  @ApiPropertyOptional({ minimum: 2, example: 10 })
  @IsOptional()
  @IsInt()
  @Min(2)
  maxSlots?: number;

  @ApiPropertyOptional({ minimum: 0, example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceCharge?: number;

  @ApiPropertyOptional({ minimum: 0, example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lateFee?: number;
}
