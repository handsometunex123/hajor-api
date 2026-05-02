import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DisputeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  type: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  evidenceUrl?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  adminNotes?: string;

  @ApiPropertyOptional()
  resolvedBy?: string;

  @ApiPropertyOptional()
  resolvedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
