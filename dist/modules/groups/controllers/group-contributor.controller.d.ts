import { GroupContributorService } from '../group-contributor.service';
import { ContributorSwapService } from '../contributor-swap.service';
import { SwapPayoutDto } from '../dto/swap-payout.dto';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';
import { GroupService } from '../group.service';
export declare class GroupContributorController {
    private readonly svc;
    private readonly swapSvc;
    private readonly groupService;
    constructor(svc: GroupContributorService, swapSvc: ContributorSwapService, groupService: GroupService);
    list(req: RequestWithUser, groupId: string, query: ListQueryDto): Promise<{
        groupId: string;
        slots: number;
        items: {
            id: string;
            displayId: string;
            userId: string;
            payoutOrder: number;
            isActive: boolean;
            termsAcceptedAt: Date;
            joinedAt: Date;
            user: {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
                phone: string;
            };
            joinMethod: import(".prisma/client").JoinMethod;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    addSelf(req: RequestWithUser, groupId: string): Promise<any>;
    remove(req: RequestWithUser, groupId: string, contributorId: string): Promise<{
        success: boolean;
    }>;
    swap(req: RequestWithUser, groupId: string, dto: SwapPayoutDto): Promise<(import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        requestedById: string;
        contributorAId: string;
        contributorBId: string;
        status: import(".prisma/client").ContributorSwapStatus;
        contributorAApprovedAt: Date | null;
        contributorBApprovedAt: Date | null;
        executedAt: Date | null;
        rejectedById: string | null;
        rejectedAt: Date | null;
        cancelledAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}) | {
        success: boolean;
    }>;
    acceptTerms(req: RequestWithUser, groupId: string, contributorId: string): Promise<{
        success: boolean;
        termsAcceptedAt: Date;
    }>;
    nudgeTerms(req: RequestWithUser, groupId: string): Promise<{
        sent: number;
        message: string;
        total?: undefined;
    } | {
        sent: number;
        total: number;
        message?: undefined;
    }>;
}
export declare class ContributorSwapController {
    private readonly swapSvc;
    constructor(swapSvc: ContributorSwapService);
    list(req: RequestWithUser, groupId: string, status?: string): Promise<({
        contributorA: {
            id: string;
            displayId: string;
            payoutOrder: number;
            user: {
                id: string;
                firstName: string;
                lastName: string;
            };
        };
        contributorB: {
            id: string;
            displayId: string;
            payoutOrder: number;
            user: {
                id: string;
                firstName: string;
                lastName: string;
            };
        };
        requestedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        requestedById: string;
        contributorAId: string;
        contributorBId: string;
        status: import(".prisma/client").ContributorSwapStatus;
        contributorAApprovedAt: Date | null;
        contributorBApprovedAt: Date | null;
        executedAt: Date | null;
        rejectedById: string | null;
        rejectedAt: Date | null;
        cancelledAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {})[]>;
    approve(req: RequestWithUser, groupId: string, requestId: string): Promise<{
        status: string;
        requestId: string;
    }>;
    reject(req: RequestWithUser, groupId: string, requestId: string): Promise<{
        success: boolean;
    }>;
    cancel(req: RequestWithUser, groupId: string, requestId: string): Promise<{
        success: boolean;
    }>;
}
