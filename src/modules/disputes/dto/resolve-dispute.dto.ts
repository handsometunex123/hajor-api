import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveDisputeDto {
  @ApiProperty({ enum: ['INVESTIGATING', 'RESOLVED', 'REJECTED'], example: 'RESOLVED' })
  @IsNotEmpty()
  @IsString()
  @IsIn(['INVESTIGATING', 'RESOLVED', 'REJECTED'])
  status: string;

  @ApiPropertyOptional({ example: 'Verified payment was received late due to bank delay' })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
