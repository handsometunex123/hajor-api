import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationQueueService } from '../../infrastructure/queue/notification-queue.service';
import { JsonObject } from '../../common/types/json';

type NotifyParams = { userId?: string; type: string; title?: string; message?: string; payload?: JsonObject };
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private readonly prisma: PrismaService, private readonly queue: NotificationQueueService) {}

  async sendNotification(params: NotifyParams) {
    const { userId = null, type, title = null, message = null, payload = {} } = params;

    // persist in-app notification
    const note = await this.prisma.notification.create({ data: { userId, type: type as any, title, message, metadata: payload } });
    this.logger.log(`Created notification ${note.id} for user=${userId} type=${type}`);

    // Determine notification channel for this user
    let channel = 'EMAIL';
    let userPhone: string | null = null;
    if (userId) {
      try {
        const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { notificationChannel: true, phone: true } as any });
        if (u) {
          channel = (u as any).notificationChannel || 'EMAIL';
          userPhone = (u as any).phone || null;
        }
      } catch (_) { /* ignore */ }
    }

    // Enqueue in-app / email delivery job (non-blocking)
    if (channel === 'EMAIL' || channel === 'BOTH') {
      try {
        await this.queue.sendNotification(userId || '', type, { title, message, payload });
      } catch (err) {
        this.logger.warn('Failed to enqueue notification job', err?.message || err);
      }
    }

    // Enqueue SMS for proxy users (SMS or BOTH channels)
    // Key transaction events: PAYOUT_SUCCESS and PAYMENT_SUCCESS always get SMS for proxy users
    if ((channel === 'SMS' || channel === 'BOTH') && userPhone) {
      const smsBody = message || title || type;
      try {
        await this.queue.sendNotification(userId || '', 'sms', { phone: userPhone, message: smsBody, payload });
      } catch (err) {
        this.logger.warn('Failed to enqueue SMS notification job', err?.message || err);
      }
    }

    return note;
  }

  async listByUser(userId: string, opts: { page?: number; limit?: number; isRead?: boolean; type?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const allowedSortFields = ['createdAt'];
    const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: any = { userId };
    if (opts.isRead !== undefined) where.isRead = opts.isRead;
    if (opts.type) where.type = opts.type;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async markRead(notificationId: string, userId: string) {
    const note = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!note) throw new Error('Notification not found');
    if (note.userId && note.userId !== userId) throw new Error('Forbidden');
    return this.prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
  }
}
