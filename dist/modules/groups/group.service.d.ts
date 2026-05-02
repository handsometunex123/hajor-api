import { GroupStatus, Frequency } from '../../common/enums';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TransactionsService } from '../transactions/transactions.service';
export declare class GroupService {
    private readonly prisma;
    private readonly notifications;
    private readonly transactions;
    constructor(prisma: PrismaService, notifications: NotificationsService, transactions: TransactionsService);
    createGroup(actorId: string, dto: {
        name: string;
        description?: string;
        maxSlots: number;
        contributionAmount: number;
        frequency: Frequency;
        serviceCharge?: number;
        lateFee?: number;
        adminIndemnityAccepted: boolean;
        gracePeriodDays?: number;
    }, ipAddress?: string): Promise<{
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
        joinToken: string;
    }>;
    getGroupDetails(groupId: string): Promise<{
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
    getMyStatus(groupId: string, userId: string): Promise<{
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
    searchGroups(filter?: {
        name?: string;
        frequency?: Frequency;
        status?: GroupStatus;
        contributionAmount?: number;
        contributionAmountMin?: number;
        contributionAmountMax?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }, opts?: {
        page?: number;
        limit?: number;
    }): Promise<{
        items: (import("@prisma/client/runtime").GetResult<{
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
        }, unknown> & {})[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getRandomJoinableGroups(userId: string, limit?: number): Promise<{
        id: any;
        name: any;
        description: any;
        frequency: any;
        contributionAmount: any;
        maxSlots: any;
        currentMembers: number;
        serviceCharge: any;
        lateFee: any;
    }[]>;
    getGroupFeed(groupId: string, opts?: {
        page?: number;
        limit?: number;
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
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
    private static readonly CORE_FIELDS;
    updateGroup(actorId: string, groupId: string, dto: {
        name?: string;
        description?: string;
        terms?: string;
        contributionAmount?: number;
        frequency?: Frequency;
        maxSlots?: number;
        serviceCharge?: number;
        lateFee?: number;
    }): Promise<import("@prisma/client/runtime").GetResult<{
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
    assertKycVerified(userId: string): Promise<void>;
    assertWalletProvisioned(userId: string): Promise<void>;
    freezeGroup(actorId: string, groupId: string, reason: string): Promise<import("@prisma/client/runtime").GetResult<{
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
    unfreezeGroup(actorId: string, groupId: string): Promise<import("@prisma/client/runtime").GetResult<{
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
    assertNotFrozen(group: {
        frozenAt?: Date | null;
    }): void;
    deleteGroup(actorId: string, groupId: string, reason?: string): Promise<{
        ok: boolean;
    }>;
    settleGroup(actorId: string, groupId: string): Promise<{
        ok: boolean;
        amount: string;
    }>;
    assertGroupContributorOrAdmin(userId: string, groupId: string): Promise<void>;
}
