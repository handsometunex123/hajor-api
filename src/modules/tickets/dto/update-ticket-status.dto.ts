import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED'] })
  @IsEnum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED'])
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
