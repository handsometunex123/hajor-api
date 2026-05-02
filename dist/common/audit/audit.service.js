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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
let AuditService = class AuditService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(params) {
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
    async findAll(query) {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', actorId, action, entityType, entityId, search, from, to, } = query;
        const where = { deletedAt: null };
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
        if (search) {
            where.action = { contains: search, mode: 'insensitive' };
        }
        if (from || to) {
            where.createdAt = {};
            if (from)
                where.createdAt.gte = new Date(from);
            if (to)
                where.createdAt.lte = new Date(to);
        }
        const skip = (page - 1) * limit;
        const orderBy = { [sortBy]: sortOrder };
        const [total, rows] = await Promise.all([
            this.prisma.auditLog.count({ where }),
            this.prisma.auditLog.findMany({
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
            items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
            pagination: {
                total,
                page,
                limit,
                pages: Math.max(1, Math.ceil(total / limit)),
            },
        };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map