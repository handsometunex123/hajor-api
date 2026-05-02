import { ApiProperty } from '@nestjs/swagger';

export class CycleCreatedResponseDto {
  @ApiProperty()
  id: string;
}
