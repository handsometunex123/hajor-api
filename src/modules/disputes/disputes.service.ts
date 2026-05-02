import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DisputeStatus } from '@prisma/client';

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async createDispute(data: { userId: string; type: string; description?: string; evidenceUrl?: string }) {
    return this.prisma.dispute.create({ data });
  }

  async resolveDispute(disputeId: string, adminId: string, dto: { status: string; adminNotes?: string }) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status === 'RESOLVED' || dispute.status === 'REJECTED') {
      throw new BadRequestException('Dispute is already closed');
    }

    const notificationType = dto.status === 'RESOLVED' ? 'DISPUTE_RESOLVED' : dto.status === 'REJECTED' ? 'DISPUTE_REJECTED' : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status: dto.status as DisputeStatus,
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
      } catch (_) {}
    }

    return updated;
  }

  async listByUser(userId: string, opts: { page?: number; limit?: number; status?: string; type?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 200) : 50;
    const skip = (page - 1) * limit;

    const allowedSortFields = ['createdAt', 'status', 'type'];
    const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: any = { userId };
    if (opts.status) where.status = opts.status;
    if (opts.type) where.type = opts.type;

    const [rows, total] = await Promise.all([
      this.prisma.dispute.findMany({ where, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.dispute.count({ where }),
    ]);
    return { items: rows, pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } };
  }
}
