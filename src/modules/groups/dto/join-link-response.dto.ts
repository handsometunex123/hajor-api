import { ApiProperty } from '@nestjs/swagger';

export class JoinLinkResponseDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  token!: string;
}
