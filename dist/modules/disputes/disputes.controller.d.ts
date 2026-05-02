import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
export declare class DisputesController {
    private readonly disputes;
    constructor(disputes: DisputesService);
    create(dto: CreateDisputeDto): Promise<{
        id: string;
        status: import(".prisma/client").DisputeStatus;
    }>;
    list(userId: string, status: string, type: string, query: ListQueryDto): Promise<{
        items: (import("@prisma/client/runtime").GetResult<{
            id: string;
            userId: string;
            type: string;
            status: import(".prisma/client").DisputeStatus;
            description: string | null;
            evidenceUrl: string | null;
            adminNotes: string | null;
            resolvedBy: string | null;
            resolvedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }, unknown> & {})[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    resolve(req: RequestWithUser, id: string, dto: ResolveDisputeDto): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        userId: string;
        type: string;
        status: import(".prisma/client").DisputeStatus;
        description: string | null;
        evidenceUrl: string | null;
        adminNotes: string | null;
        resolvedBy: string | null;
        resolvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }, unknown> & {}>;
}
