export declare class AuditLogItemDto {
    id: string;
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata: any;
    createdAt: string;
}
declare class AuditLogPaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export declare class AuditLogListResponseDto {
    items: AuditLogItemDto[];
    pagination: AuditLogPaginationMeta;
}
export {};
