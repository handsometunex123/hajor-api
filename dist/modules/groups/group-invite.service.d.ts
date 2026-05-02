import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { ConfigService } from '@nestjs/config';
export declare class GroupInviteService {
    private readonly prisma;
    private readonly notifications;
    private readonly queueService;
    private readonly redis;
    private readonly config;
    private readonly saltRounds;
    constructor(prisma: PrismaService, notifications: NotificationsService, queueService: QueueService, redis: RedisService, config: ConfigService);
    getInviteById(inviteId: string): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        userId: string | null;
        invitedById: string;
        metadata: import(".prisma/client").Prisma.JsonValue | null;
        status: import(".prisma/client").JoinRequestStatus;
        expiresAt: Date | null;
        createdAt: Date;
    }, unknown> & {}>;
    createContactInvite(adminId: string, groupId: string, contact: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
    }): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        userId: string | null;
        invitedById: string;
        metadata: import(".prisma/client").Prisma.JsonValue | null;
        status: import(".prisma/client").JoinRequestStatus;
        expiresAt: Date | null;
        createdAt: Date;
    }, unknown> & {}>;
    verifyContactInvite(_inviteId: string, _otp: string): Promise<void>;
    createInvite(adminId: string, groupId: string, userId: string): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        userId: string | null;
        invitedById: string;
        metadata: import(".prisma/client").Prisma.JsonValue | null;
        status: import(".prisma/client").JoinRequestStatus;
        expiresAt: Date | null;
        createdAt: Date;
    }, unknown> & {}>;
    upsertJoinLink(adminId: string, groupId: string): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        token: string;
        isActive: boolean;
        pausedAt: Date | null;
        pausedById: string | null;
        createdById: string;
        reusable: boolean;
        createdAt: Date;
    }, unknown> & {}>;
    getJoinLink(actorId: string, groupId: string): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        token: string;
        isActive: boolean;
        pausedAt: Date | null;
        pausedById: string | null;
        createdById: string;
        reusable: boolean;
        createdAt: Date;
    }, unknown> & {}>;
    consumeJoinLink(userId: string, token: string): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        userId: string | null;
        invitedById: string;
        metadata: import(".prisma/client").Prisma.JsonValue | null;
        status: import(".prisma/client").JoinRequestStatus;
        expiresAt: Date | null;
        createdAt: Date;
    }, unknown> & {}>;
    pauseJoinLink(adminId: string, groupId: string): Promise<{
        success: boolean;
    }>;
    resumeJoinLink(adminId: string, groupId: string): Promise<{
        success: boolean;
    }>;
    revokeJoinLink(adminId: string, groupId: string): Promise<{
        success: boolean;
    }>;
    proxyRegisterInit(adminId: string, groupId: string, data: {
        firstName: string;
        lastName: string;
        phone: string;
        email?: string;
    }): Promise<{
        message: string;
        phone: string;
        expiresInSeconds: number;
    }>;
    proxyRegisterConfirm(adminId: string, groupId: string, data: {
        phone: string;
        otp: string;
    }): Promise<{
        message: string;
        userId: string;
        contributorId: any;
        loginEmail: any;
    }>;
    listMyInvites(userId: string, opts?: {
        page?: number;
        limit?: number;
        status?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        items: ({
            group: {
                id: string;
                name: string;
                contributionAmount: import("@prisma/client/runtime").Decimal;
                frequency: import(".prisma/client").GroupFrequency;
                status: import(".prisma/client").GroupStatus;
            };
            invitedBy: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & import("@prisma/client/runtime").GetResult<{
            id: string;
            groupId: string;
            userId: string | null;
            invitedById: string;
            metadata: import(".prisma/client").Prisma.JsonValue | null;
            status: import(".prisma/client").JoinRequestStatus;
            expiresAt: Date | null;
            createdAt: Date;
        }, unknown> & {})[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    listPendingInvites(adminId: string, groupId: string, opts?: {
        page?: number;
        limit?: number;
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        items: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
                phone: string;
            };
            invitedBy: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & import("@prisma/client/runtime").GetResult<{
            id: string;
            groupId: string;
            userId: string | null;
            invitedById: string;
            metadata: import(".prisma/client").Prisma.JsonValue | null;
            status: import(".prisma/client").JoinRequestStatus;
            expiresAt: Date | null;
            createdAt: Date;
        }, unknown> & {})[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    acceptInvite(userId: string, inviteId: string): Promise<{
        contributor: any;
    }>;
    rejectInvite(userId: string, inviteId: string): Promise<{
        success: boolean;
    }>;
}
