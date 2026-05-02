export declare const AUDIT_SORT_FIELDS: readonly ["createdAt", "action", "entityType", "actorId"];
export type AuditSortField = (typeof AUDIT_SORT_FIELDS)[number];
export declare class AuditLogQueryDto {
    page?: number;
    limit?: number;
    sortBy?: AuditSortField;
    sortOrder?: 'asc' | 'desc';
    actorId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    search?: string;
    from?: string;
    to?: string;
}
