import { ConfigService } from '@nestjs/config';
import { GroupService } from '../group.service';
import { GroupLifecycleService } from '../group-lifecycle.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';
export declare class GroupController {
    private readonly groupService;
    private readonly lifecycle;
    private readonly config;
    constructor(groupService: GroupService, lifecycle: GroupLifecycleService, config: ConfigService);
    getPlatformIndemnity(): {
        indemnity: string;
    };
    getPlatformTerms(): {
        terms: string;
    };
    create(req: RequestWithUser, dto: CreateGroupDto): Promise<{
        group: import("@prisma/client/runtime").GetResult<{
            id: string;
            name: string;
            description: string | null;
            adminId: string;
            contributionAmount: import("@prisma/client/runtime").Decimal;
            frequency: import(".prisma/client").GroupFrequency;
            maxSlots: number;
            serviceCharge: import("@prisma/client/runtime").Decimal;
            lateFee: import("@prisma/client/runtime").Decimal;
            status: import(".prisma/client").GroupStatus;
            startDate: Date | null;
            firstContributionDate: Date | null;
            gracePeriodDays: number;
            adminIndemnityAccepted: boolean;
            adminIndemnityAcceptedAt: Date | null;
            adminIndemnityIpAddress: string | null;
            termsVersion: number;
            frozenAt: Date | null;
            frozenReason: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }, unknown> & {};
        joinUrl: string;
        token: string;
    }>;
    get(id: string): Promise<{
        contributorCount: number;
        admin: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
        };
        cycles: (import("@prisma/client/runtime").GetResult<{
            id: string;
            groupId: string;
            cycleNumber: number;
            contributionDate: Date;
            payoutDate: Date;
            status: import(".prisma/client").ContributionCycleStatus;
            completedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }, unknown> & {})[];
        id: string;
        name: string;
        description: string;
        contributionAmount: import("@prisma/client/runtime").Decimal;
        frequency: import(".prisma/client").GroupFrequency;
        maxSlots: number;
        serviceCharge: import("@prisma/client/runtime").Decimal;
        lateFee: import("@prisma/client/runtime").Decimal;
        status: import(".prisma/client").GroupStatus;
        startDate: Date;
        firstContributionDate: Date;
        gracePeriodDays: number;
        adminIndemnityAccepted: boolean;
        adminIndemnityAcceptedAt: Date;
        adminIndemnityIpAddress: string;
        termsVersion: number;
        frozenAt: Date;
        frozenReason: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date;
        adminId: string;
    }>;
    myContributors(req: RequestWithUser, id: string): Promise<{
        isContributor: boolean;
        termsRequired: boolean;
        contributors: {
            id: string;
            displayId: string;
            payoutOrder: number;
            isActive: boolean;
            termsAcceptedAt: Date;
        }[];
    }>;
    getRandomGroups(req: RequestWithUser, limit?: number): Promise<{
        data: {
            id: any;
            name: any;
            description: any;
            frequency: any;
            contributionAmount: any;
            maxSlots: any;
            currentMembers: number;
            serviceCharge: any;
            lateFee: any;
        }[];
    }>;
    feed(req: RequestWithUser, id: string, query: ListQueryDto): Promise<{
        items: (import("@prisma/client/runtime").GetResult<{
            id: string;
            actorId: string | null;
            action: string;
            entityType: string;
            entityId: string;
            metadata: import(".prisma/client").Prisma.JsonValue | null;
            createdAt: Date;
            deletedAt: Date | null;
        }, unknown> & {})[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    startGroup(req: RequestWithUser, id: string, body: {
        firstContributionDate?: string;
    }): Promise<{
        success: boolean;
        cycles: any[];
    }>;
    update(req: RequestWithUser, id: string, dto: UpdateGroupDto): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        name: string;
        description: string | null;
        adminId: string;
        contributionAmount: import("@prisma/client/runtime").Decimal;
        frequency: import(".prisma/client").GroupFrequency;
        maxSlots: number;
        serviceCharge: import("@prisma/client/runtime").Decimal;
        lateFee: import("@prisma/client/runtime").Decimal;
        status: import(".prisma/client").GroupStatus;
        startDate: Date | null;
        firstContributionDate: Date | null;
        gracePeriodDays: number;
        adminIndemnityAccepted: boolean;
        adminIndemnityAcceptedAt: Date | null;
        adminIndemnityIpAddress: string | null;
        termsVersion: number;
        frozenAt: Date | null;
        frozenReason: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }, unknown> & {}>;
    freeze(req: RequestWithUser, id: string, body: {
        reason: string;
    }): Promise<{
        ok: boolean;
    }>;
    delete(req: RequestWithUser, id: string, body: {
        reason?: string;
    }): Promise<{
        ok: boolean;
    }>;
    forcePayout(req: RequestWithUser, id: string, cycleId: string): Promise<{
        ok: boolean;
        cycleId: string;
    }>;
    rescheduleCycle(req: RequestWithUser, id: string, cycleId: string, body: {
        contributionDate: string;
        reason: string;
    }): Promise<{
        ok: boolean;
        rescheduledCount: number;
        cycles: (import("@prisma/client/runtime").GetResult<{
            id: string;
            groupId: string;
            cycleNumber: number;
            contributionDate: Date;
            payoutDate: Date;
            status: import(".prisma/client").ContributionCycleStatus;
            completedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }, unknown> & {})[];
    }>;
    requestReschedule(req: RequestWithUser, id: string, cycleId: string, body: {
        requestedDate: string;
        reason: string;
    }): Promise<{
        ok: boolean;
        ticketId: string;
        message: string;
    }>;
    approveCycleReschedule(req: RequestWithUser, ticketId: string): Promise<{
        ok: boolean;
        rescheduledCount: number;
        cycles: (import("@prisma/client/runtime").GetResult<{
            id: string;
            groupId: string;
            cycleNumber: number;
            contributionDate: Date;
            payoutDate: Date;
            status: import(".prisma/client").ContributionCycleStatus;
            completedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }, unknown> & {})[];
    }>;
    rejectCycleReschedule(req: RequestWithUser, ticketId: string, body: {
        notes?: string;
    }): Promise<{
        ok: boolean;
        ticketId: string;
    }>;
    settle(req: RequestWithUser, id: string): Promise<{
        ok: boolean;
        amount: string;
    }>;
    unfreeze(req: RequestWithUser, id: string): Promise<{
        ok: boolean;
    }>;
}
