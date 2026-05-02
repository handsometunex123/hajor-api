import { IsOptional, IsInt, Min, Max, IsString, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const AUDIT_SORT_FIELDS = ['createdAt', 'action', 'entityType', 'actorId'] as const;
export type AuditSortField = (typeof AUDIT_SORT_FIELDS)[number];

export class AuditLogQueryDto {
  // ─── Pagination ───────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Page size (max 200)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  // ─── Sorting ──────────────────────────────────────────────────────────────
  @ApiPropertyOptional({
    enum: AUDIT_SORT_FIELDS,
    example: 'createdAt',
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsIn(AUDIT_SORT_FIELDS)
  sortBy?: AuditSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], example: 'desc', description: 'Sort direction' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  // ─── Filters ──────────────────────────────────────────────────────────────
  @ApiPropertyOptional({
    description: 'Filter by acting user UUID. Pass "null" to get system-generated entries (actorId IS NULL).',
    example: 'a1b2c3d4-...',
  })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({
    description:
      'Filter by action name (exact match). E.g. send_otp, provision_va, reconcile_deposit_success.',
    example: 'provision_va',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity type (exact match). E.g. User, Wallet, Transaction, Group, Invitation.',
    example: 'Wallet',
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific entity UUID.',
    example: 'f1e2d3c4-...',
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Full-text search across the action field (case-insensitive contains).',
    example: 'provision',
  })
  @IsOptional()
  @IsString()
  search?: string;

  // ─── Date range ───────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Return logs created on or after this ISO-8601 datetime.', example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Return logs created on or before this ISO-8601 datetime.', example: '2026-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
