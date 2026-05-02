import { ApiProperty } from '@nestjs/swagger';

export class ProcessedResponseDto {
  @ApiProperty()
  ok: boolean;

  @ApiProperty({ required: false })
  txId?: string;
}
