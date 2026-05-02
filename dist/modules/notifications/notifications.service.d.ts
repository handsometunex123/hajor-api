import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationQueueService } from '../../infrastructure/queue/notification-queue.service';
import { JsonObject } from '../../common/types/json';
type NotifyParams = {
    userId?: string;
    type: string;
    title?: string;
    message?: string;
    payload?: JsonObject;
};
export declare class NotificationsService {
    private readonly prisma;
    private readonly queue;
    private readonly logger;
    constructor(prisma: PrismaService, queue: NotificationQueueService);
    sendNotification(params: NotifyParams): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        userId: string | null;
        type: import(".prisma/client").NotificationType;
        title: string | null;
        message: string | null;
        isRead: boolean;
        metadata: import(".prisma/client").Prisma.JsonValue | null;
        createdAt: Date;
    }, unknown> & {}>;
    listByUser(userId: string, opts?: {
        page?: number;
        limit?: number;
        isRead?: boolean;
        type?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        items: (import("@prisma/client/runtime").GetResult<{
            id: string;
            userId: string | null;
            type: import(".prisma/client").NotificationType;
            title: string | null;
            message: string | null;
            isRead: boolean;
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
    markRead(notificationId: string, userId: string): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        userId: string | null;
        type: import(".prisma/client").NotificationType;
        title: string | null;
        message: string | null;
        isRead: boolean;
        metadata: import(".prisma/client").Prisma.JsonValue | null;
        createdAt: Date;
    }, unknown> & {}>;
}
export {};
