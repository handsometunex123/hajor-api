import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogListResponseDto } from './dto/audit-log-response.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: any;
  }) {
    const { actorId = null, action, entityType, entityId, metadata = {} } = params;
    return this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        metadata,
      },
    });
  }

  async findAll(query: AuditLogQueryDto): Promise<AuditLogListResponseDto> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      actorId,
      action,
      entityType,
      entityId,
      search,
      from,
      to,
    } = query;

    // ─── Build where clause ──────────────────────────────────────────────────
    const where: any = { deletedAt: null };

    // actorId: passing the string "null" means "only system events"
    if (actorId !== undefined) {
      where.actorId = actorId === 'null' ? null : actorId;
    }

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    // search is a case-insensitive contains match on the action field
    if (search) {
      where.action = { contains: search, mode: 'insensitive' };
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    const [total, rows] = await Promise.all([
      (this.prisma.auditLog as any).count({ where }),
      (this.prisma.auditLog as any).findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          actorId: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      items: rows.map((r: any) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
