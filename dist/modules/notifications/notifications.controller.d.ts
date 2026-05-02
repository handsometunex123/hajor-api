import { NotificationsService } from './notifications.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { JsonObject } from '../../common/types/json';
declare class NotifyDto {
    userId?: string;
    type: string;
    title?: string;
    payload?: JsonObject;
}
export declare class NotificationsController {
    private readonly notifications;
    constructor(notifications: NotificationsService);
    notify(dto: NotifyDto): Promise<{
        id: string;
    }>;
    list(req: RequestWithUser, query: ListQueryDto, isRead?: string, type?: string): Promise<{
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
    update(id: string, req: RequestWithUser): Promise<{
        id: string;
        isRead: boolean;
    }>;
}
export {};
