import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddContributorDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Attestation text confirming admin responsibility' })
  @IsString()
  attestationText: string;

  @ApiProperty({ description: 'Admin must agree to indemnity terms' })
  @IsBoolean()
  agreementAccepted: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}
