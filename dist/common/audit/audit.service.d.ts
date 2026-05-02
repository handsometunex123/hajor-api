import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogListResponseDto } from './dto/audit-log-response.dto';
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(params: {
        actorId?: string | null;
        action: string;
        entityType: string;
        entityId: string;
        metadata?: any;
    }): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        actorId: string | null;
        action: string;
        entityType: string;
        entityId: string;
        metadata: import(".prisma/client").Prisma.JsonValue | null;
        createdAt: Date;
        deletedAt: Date | null;
    }, unknown> & {}>;
    findAll(query: AuditLogQueryDto): Promise<AuditLogListResponseDto>;
}
