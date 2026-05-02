import { ApiProperty } from '@nestjs/swagger';

export class FraudFlagResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reason: string;

  @ApiProperty()
  severity: string;

  @ApiProperty({ required: false })
  status?: string;
}
