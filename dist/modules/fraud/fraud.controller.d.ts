import { FraudService } from './fraud.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { ReviewFlagDto } from './dto/review-flag.dto';
export declare class FraudController {
    private readonly fraud;
    constructor(fraud: FraudService);
    listFlags(query: ListQueryDto): Promise<{
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
    reviewFlag(id: string, dto: ReviewFlagDto, user: {
        id: string;
    }): Promise<import("@prisma/client/runtime").GetResult<{
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
