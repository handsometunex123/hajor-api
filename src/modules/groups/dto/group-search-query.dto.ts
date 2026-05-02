import { IsOptional, IsString, IsInt, IsIn, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Frequency } from '../../../common/enums';

export class GroupSearchQueryDto {
  @ApiPropertyOptional({ description: 'Search by group name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Frequency filter (e.g. WEEKLY)', enum: Frequency })
  @IsOptional()
  @IsString()
  @IsIn([Frequency.WEEKLY, Frequency.MONTHLY])
  frequency?: Frequency;

  @ApiPropertyOptional({ description: 'Status filter' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by exact contribution amount', example: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  contributionAmount?: number;

  @ApiPropertyOptional({ description: 'Minimum contribution amount', example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  contributionAmountMin?: number;

  @ApiPropertyOptional({ description: 'Maximum contribution amount', example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  contributionAmountMax?: number;

  @ApiPropertyOptional({ description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size (max 500)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order: asc or desc' })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
