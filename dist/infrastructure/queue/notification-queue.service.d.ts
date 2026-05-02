import { QueueService } from './queue.service';
import { JsonObject } from '../../common/types/json';
export declare class NotificationQueueService {
    private readonly queue;
    private readonly logger;
    constructor(queue: QueueService);
    sendNotification(userId: string, type: string, payload: JsonObject, opts?: JsonObject): Promise<import("bullmq").Job<any, any, string>>;
}
