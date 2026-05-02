import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GroupDetailsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  adminId: string;

  @ApiPropertyOptional({ description: 'Group terms text, if any' })
  terms?: string;
}
