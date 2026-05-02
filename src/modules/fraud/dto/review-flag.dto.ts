import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JsonObject } from '../../../common/types/json';

export class ReviewFlagDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'REVIEWED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'REVIEWED'])
  status?: 'ACTIVE' | 'REVIEWED';

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: JsonObject;
}
