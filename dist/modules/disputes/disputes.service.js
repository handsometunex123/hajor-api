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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
let DisputesService = class DisputesService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async createDispute(data) {
        return this.prisma.dispute.create({ data });
    }
    async resolveDispute(disputeId, adminId, dto) {
        const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
        if (!dispute)
            throw new common_1.NotFoundException('Dispute not found');
        if (dispute.status === 'RESOLVED' || dispute.status === 'REJECTED') {
            throw new common_1.BadRequestException('Dispute is already closed');
        }
        const notificationType = dto.status === 'RESOLVED' ? 'DISPUTE_RESOLVED' : dto.status === 'REJECTED' ? 'DISPUTE_REJECTED' : null;
        const updated = await this.prisma.$transaction(async (tx) => {
            const result = await tx.dispute.update({
                where: { id: disputeId },
                data: {
                    status: dto.status,
                    adminNotes: dto.adminNotes || null,
                    resolvedBy: dto.status === 'RESOLVED' || dto.status === 'REJECTED' ? adminId : null,
                    resolvedAt: dto.status === 'RESOLVED' || dto.status === 'REJECTED' ? new Date() : null,
                },
            });
            await tx.auditLog.create({
                data: { actorId: adminId, action: `dispute_${dto.status.toLowerCase()}`, entityType: 'Dispute', entityId: disputeId, metadata: { adminNotes: dto.adminNotes, previousStatus: dispute.status } },
            });
            return result;
        });
        if (notificationType) {
            try {
                await this.notifications.sendNotification({ userId: dispute.userId, type: notificationType, title: `Dispute ${dto.status.toLowerCase()}`, message: `Your dispute has been ${dto.status.toLowerCase()}`, payload: { disputeId, adminNotes: dto.adminNotes } });
            }
            catch (_) { }
        }
        return updated;
    }
    async listByUser(userId, opts = {}) {
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 200) : 50;
        const skip = (page - 1) * limit;
        const allowedSortFields = ['createdAt', 'status', 'type'];
        const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
        const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';
        const where = { userId };
        if (opts.status)
            where.status = opts.status;
        if (opts.type)
            where.type = opts.type;
        const [rows, total] = await Promise.all([
            this.prisma.dispute.findMany({ where, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
            this.prisma.dispute.count({ where }),
        ]);
        return { items: rows, pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } };
    }
};
exports.DisputesService = DisputesService;
exports.DisputesService = DisputesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notifications_service_1.NotificationsService])
], DisputesService);
//# sourceMappingURL=disputes.service.js.map