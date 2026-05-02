import { ApiProperty } from '@nestjs/swagger';

export class OkResponseDto {
  @ApiProperty()
  ok: boolean;
}
