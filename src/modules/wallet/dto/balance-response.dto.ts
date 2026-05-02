import { ApiProperty } from '@nestjs/swagger';

export class BalanceResponseDto {
  @ApiProperty()
  balance!: string | number;
}
