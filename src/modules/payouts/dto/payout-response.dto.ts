import { ApiProperty } from '@nestjs/swagger';

export class PayoutResponseDto {
  @ApiProperty()
  ok: boolean;

  @ApiProperty({ required: false })
  cycleId?: string;
}
