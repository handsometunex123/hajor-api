
import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from './queue.service';
import { JsonObject } from '../../common/types/json';

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(private readonly queue: QueueService) {}

  async sendNotification(userId: string, type: string, payload: JsonObject, opts: JsonObject = {}) {
    this.logger.log(`Queueing notification for user=${userId} type=${type}`);
    return this.queue.addNotificationJob('send-notification', { userId, type, payload }, opts);
  }
}
