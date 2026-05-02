import { JsonObject } from '../../../common/types/json';
export declare class GroupFeedItemDto {
    id: string;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: JsonObject;
    createdAt: Date;
}
