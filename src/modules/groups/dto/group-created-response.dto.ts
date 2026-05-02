import { ApiProperty } from '@nestjs/swagger';

class SimpleGroup {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class GroupCreatedResponseDto {
  @ApiProperty({ type: SimpleGroup })
  group: SimpleGroup;

  @ApiProperty()
  joinUrl: string;

  @ApiProperty()
  token: string;
}
