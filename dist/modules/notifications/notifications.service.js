"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const notification_queue_service_1 = require("../../infrastructure/queue/notification-queue.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma, queue) {
        this.prisma = prisma;
        this.queue = queue;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async sendNotification(params) {
        const { userId = null, type, title = null, message = null, payload = {} } = params;
        const note = await this.prisma.notification.create({ data: { userId, type: type, title, message, metadata: payload } });
        this.logger.log(`Created notification ${note.id} for user=${userId} type=${type}`);
        let channel = 'EMAIL';
        let userPhone = null;
        if (userId) {
            try {
                const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { notificationChannel: true, phone: true } });
                if (u) {
                    channel = u.notificationChannel || 'EMAIL';
                    userPhone = u.phone || null;
                }
            }
            catch (_) { }
        }
        if (channel === 'EMAIL' || channel === 'BOTH') {
            try {
                await this.queue.sendNotification(userId || '', type, { title, message, payload });
            }
            catch (err) {
                this.logger.warn('Failed to enqueue notification job', (err === null || err === void 0 ? void 0 : err.message) || err);
            }
        }
        if ((channel === 'SMS' || channel === 'BOTH') && userPhone) {
            const smsBody = message || title || type;
            try {
                await this.queue.sendNotification(userId || '', 'sms', { phone: userPhone, message: smsBody, payload });
            }
            catch (err) {
                this.logger.warn('Failed to enqueue SMS notification job', (err === null || err === void 0 ? void 0 : err.message) || err);
            }
        }
        return note;
    }
    async listByUser(userId, opts = {}) {
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 50;
        const skip = (page - 1) * limit;
        const allowedSortFields = ['createdAt'];
        const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
        const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';
        const where = { userId };
        if (opts.isRead !== undefined)
            where.isRead = opts.isRead;
        if (opts.type)
            where.type = opts.type;
        const [items, total] = await Promise.all([
            this.prisma.notification.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
            this.prisma.notification.count({ where }),
        ]);
        return { items, pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } };
    }
    async markRead(notificationId, userId) {
        const note = await this.prisma.notification.findUnique({ where: { id: notificationId } });
        if (!note)
            throw new Error('Notification not found');
        if (note.userId && note.userId !== userId)
            throw new Error('Forbidden');
        return this.prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notification_queue_service_1.NotificationQueueService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map