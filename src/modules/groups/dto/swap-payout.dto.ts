import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwapPayoutDto {
  @ApiProperty()
  @IsString()
  contributorAId: string;

  @ApiProperty()
  @IsString()
  contributorBId: string;
}
