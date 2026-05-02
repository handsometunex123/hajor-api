import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class ContributorSwapService {
    private readonly prisma;
    private readonly notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    directSwap(adminId: string, groupId: string, aId: string, bId: string): Promise<{
        success: boolean;
    }>;
    swap(adminId: string, groupId: string, aId: string, bId: string): Promise<{
        success: boolean;
    } | (import("@prisma/client/runtime").GetResult<{
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
    }, unknown> & {})>;
    initiateSwapRequest(adminId: string, groupId: string, aId: string, bId: string): Promise<import("@prisma/client/runtime").GetResult<{
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
    }, unknown> & {}>;
    approveSwapRequest(userId: string, groupId: string, requestId: string): Promise<{
        status: string;
        requestId: string;
    }>;
    rejectSwapRequest(userId: string, groupId: string, requestId: string): Promise<{
        success: boolean;
    }>;
    cancelSwapRequest(adminId: string, groupId: string, requestId: string): Promise<{
        success: boolean;
    }>;
    listSwapRequests(adminId: string, groupId: string, status?: string): Promise<({
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
}
