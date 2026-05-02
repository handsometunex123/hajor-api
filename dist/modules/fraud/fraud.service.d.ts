import { JsonObject } from '../../common/types/json';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
export declare class FraudService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    hashIdentifier(value: string): string;
    checkMultipleAccounts(identifierType: string, value: string): Promise<{
        flagged: boolean;
        flags: any[];
        count?: undefined;
    } | {
        flagged: boolean;
        count: number;
        flags?: undefined;
    }>;
    checkDefaultRate(userId: string, lookbackCycles?: number, threshold?: number): Promise<{
        flagged: boolean;
        flag: import("@prisma/client/runtime").GetResult<{
            id: string;
            userId: string | null;
            groupId: string | null;
            reason: string;
            severity: import(".prisma/client").FraudSeverity;
            status: import(".prisma/client").FraudStatus;
            metadata: import(".prisma/client").Prisma.JsonValue | null;
            createdAt: Date;
        }, unknown> & {};
        defaults?: undefined;
    } | {
        flagged: boolean;
        defaults: number;
        flag?: undefined;
    }>;
    flagUser(userId: string, reason: string, severity?: 'LOW' | 'MEDIUM' | 'HIGH', metadata?: JsonObject): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        userId: string | null;
        groupId: string | null;
        reason: string;
        severity: import(".prisma/client").FraudSeverity;
        status: import(".prisma/client").FraudStatus;
        metadata: import(".prisma/client").Prisma.JsonValue | null;
        createdAt: Date;
    }, unknown> & {}>;
    flagGroup(groupId: string, reason: string, severity?: 'LOW' | 'MEDIUM' | 'HIGH', metadata?: JsonObject): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        userId: string | null;
        groupId: string | null;
        reason: string;
        severity: import(".prisma/client").FraudSeverity;
        status: import(".prisma/client").FraudStatus;
        metadata: import(".prisma/client").Prisma.JsonValue | null;
        createdAt: Date;
    }, unknown> & {}>;
    listFlags(opts?: {
        status?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        items: (import("@prisma/client/runtime").GetResult<{
            id: string;
            userId: string | null;
            groupId: string | null;
            reason: string;
            severity: import(".prisma/client").FraudSeverity;
            status: import(".prisma/client").FraudStatus;
            metadata: import(".prisma/client").Prisma.JsonValue | null;
            createdAt: Date;
        }, unknown> & {})[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    reviewFlag(flagId: string, reviewerId: string, status?: 'ACTIVE' | 'REVIEWED', metadata?: JsonObject): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        userId: string | null;
        groupId: string | null;
        reason: string;
        severity: import(".prisma/client").FraudSeverity;
        status: import(".prisma/client").FraudStatus;
        metadata: import(".prisma/client").Prisma.JsonValue | null;
        createdAt: Date;
    }, unknown> & {}>;
}
export default FraudService;
