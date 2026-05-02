import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    list(query: AuditLogQueryDto): Promise<import("./dto/audit-log-response.dto").AuditLogListResponseDto>;
}
