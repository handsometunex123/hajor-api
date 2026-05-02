import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogItemDto {
  @ApiProperty({ description: 'Log entry UUID' })
  id: string;

  @ApiPropertyOptional({ description: 'UUID of the user who triggered the action, or null for system events' })
  actorId: string | null;

  @ApiProperty({ description: 'Action name, e.g. provision_va, send_otp, reconcile_deposit_success' })
  action: string;

  @ApiProperty({ description: 'Entity type, e.g. User, Wallet, Transaction, Group' })
  entityType: string;

  @ApiProperty({ description: 'UUID of the entity affected' })
  entityId: string;

  @ApiPropertyOptional({ description: 'Arbitrary JSON metadata attached to the event' })
  metadata: any;

  @ApiProperty({ description: 'ISO-8601 creation timestamp' })
  createdAt: string;
}

class AuditLogPaginationMeta {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  pages: number;
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: [AuditLogItemDto] })
  items: AuditLogItemDto[];

  @ApiProperty({ type: AuditLogPaginationMeta })
  pagination: AuditLogPaginationMeta;
}
