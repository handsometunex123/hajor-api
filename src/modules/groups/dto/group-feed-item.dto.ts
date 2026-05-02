import { ApiProperty } from '@nestjs/swagger';
import { JsonObject } from '../../../common/types/json';

export class GroupFeedItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  actorId?: string | null;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  entityType!: string;

  @ApiProperty()
  entityId!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata?: JsonObject;

  @ApiProperty()
  createdAt!: Date;
}
