import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DisputeStatus } from '@prisma/client';
export declare class DisputesService {
    private readonly prisma;
    private readonly notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    createDispute(data: {
        userId: string;
        type: string;
        description?: string;
        evidenceUrl?: string;
    }): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        userId: string;
        type: string;
        status: DisputeStatus;
        description: string | null;
        evidenceUrl: string | null;
        adminNotes: string | null;
        resolvedBy: string | null;
        resolvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }, unknown> & {}>;
    resolveDispute(disputeId: string, adminId: string, dto: {
        status: string;
        adminNotes?: string;
    }): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        userId: string;
        type: string;
        status: DisputeStatus;
        description: string | null;
        evidenceUrl: string | null;
        adminNotes: string | null;
        resolvedBy: string | null;
        resolvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }, unknown> & {}>;
    listByUser(userId: string, opts?: {
        page?: number;
        limit?: number;
        status?: string;
        type?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        items: (import("@prisma/client/runtime").GetResult<{
            id: string;
            userId: string;
            type: string;
            status: DisputeStatus;
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
}
