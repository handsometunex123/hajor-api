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
exports.TicketService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const generate_display_id_1 = require("../../common/utils/generate-display-id");
let TicketService = class TicketService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createTicket(userId, dto) {
        const contributor = await this.prisma.groupContributor.findFirst({
            where: { groupId: dto.groupId, userId },
        });
        if (!contributor) {
            throw new common_1.BadRequestException('You must be a contributor of this group to create a ticket');
        }
        if (dto.type === 'CONTRIBUTOR_REPLACEMENT') {
            if (!dto.contributorId || !dto.newUserId) {
                throw new common_1.BadRequestException('CONTRIBUTOR_REPLACEMENT requires contributorId and newUserId');
            }
            const targetContributor = await this.prisma.groupContributor.findUnique({
                where: { id: dto.contributorId },
            });
            if (!targetContributor || targetContributor.groupId !== dto.groupId) {
                throw new common_1.BadRequestException('Invalid contributor for this group');
            }
        }
        const ticket = await this.prisma.ticket.create({
            data: {
                type: dto.type,
                groupId: dto.groupId,
                userId,
                reason: dto.reason,
                contributorId: dto.contributorId,
                newUserId: dto.newUserId,
                status: 'PENDING',
            },
        });
        return ticket;
    }
    async getTicket(ticketId) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                group: { select: { id: true, name: true, adminId: true } },
            },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        return ticket;
    }
    async getUserTickets(userId, opts) {
        const page = (opts === null || opts === void 0 ? void 0 : opts.page) && opts.page > 0 ? opts.page : 1;
        const limit = (opts === null || opts === void 0 ? void 0 : opts.limit) && opts.limit > 0 ? Math.min(opts.limit, 100) : 20;
        const skip = (page - 1) * limit;
        const allowedSortFields = ['createdAt', 'status', 'type'];
        const sortBy = (opts === null || opts === void 0 ? void 0 : opts.sortBy) && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
        const sortOrder = (opts === null || opts === void 0 ? void 0 : opts.sortOrder) === 'asc' ? 'asc' : 'desc';
        const where = { userId };
        if (opts === null || opts === void 0 ? void 0 : opts.status)
            where.status = opts.status;
        if (opts === null || opts === void 0 ? void 0 : opts.type)
            where.type = opts.type;
        const [tickets, total] = await Promise.all([
            this.prisma.ticket.findMany({
                where,
                include: {
                    group: { select: { id: true, name: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
            }),
            this.prisma.ticket.count({ where }),
        ]);
        return {
            items: tickets,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit) || 1,
            },
        };
    }
    async getGroupTickets(groupId, adminId, opts) {
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
        });
        if (!group) {
            throw new common_1.NotFoundException('Group not found');
        }
        if (group.adminId !== adminId) {
            throw new common_1.BadRequestException('Only group admin can view group tickets');
        }
        const page = (opts === null || opts === void 0 ? void 0 : opts.page) && opts.page > 0 ? opts.page : 1;
        const limit = (opts === null || opts === void 0 ? void 0 : opts.limit) && opts.limit > 0 ? Math.min(opts.limit, 100) : 20;
        const skip = (page - 1) * limit;
        const allowedSortFields = ['createdAt', 'status', 'type'];
        const sortBy = (opts === null || opts === void 0 ? void 0 : opts.sortBy) && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
        const sortOrder = (opts === null || opts === void 0 ? void 0 : opts.sortOrder) === 'asc' ? 'asc' : 'desc';
        const where = { groupId };
        if (opts === null || opts === void 0 ? void 0 : opts.status)
            where.status = opts.status;
        if (opts === null || opts === void 0 ? void 0 : opts.type)
            where.type = opts.type;
        const [tickets, total] = await Promise.all([
            this.prisma.ticket.findMany({
                where,
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
            }),
            this.prisma.ticket.count({ where }),
        ]);
        return {
            items: tickets,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit) || 1,
            },
        };
    }
    async updateTicketStatus(ticketId, adminId, dto) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { group: true },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        if (ticket.group.adminId !== adminId) {
            throw new common_1.BadRequestException('Only group admin can update ticket status');
        }
        const updateData = {
            status: dto.status,
            adminNotes: dto.adminNotes,
        };
        if (dto.status === 'RESOLVED') {
            updateData.resolvedAt = new Date();
        }
        const updated = await this.prisma.ticket.update({
            where: { id: ticketId },
            data: updateData,
        });
        if (dto.status === 'APPROVED') {
            await this.executeTicketAction(ticket);
        }
        return updated;
    }
    async executeTicketAction(ticket) {
        if (ticket.type === 'CONTRIBUTOR_REPLACEMENT' && ticket.contributorId && ticket.newUserId) {
            await this.prisma.$transaction(async (tx) => {
                const group = await tx.group.findUnique({ where: { id: ticket.groupId } });
                if (!group)
                    throw new common_1.NotFoundException('Group not found');
                if (group.status !== 'NOT_STARTED')
                    throw new common_1.BadRequestException('Can only replace contributors while group is NOT_STARTED');
                const newUserSlots = await tx.groupContributor.count({ where: { groupId: ticket.groupId, userId: ticket.newUserId } });
                if (newUserSlots >= 2)
                    throw new common_1.BadRequestException('Replacement user already has the maximum slots in this group');
                await tx.groupContributor.delete({
                    where: { id: ticket.contributorId },
                });
                const newUser = await tx.user.findUnique({ where: { id: ticket.newUserId } });
                const slotNumber = newUserSlots + 1;
                await (0, generate_display_id_1.createContributorWithDisplayId)(tx, {
                    groupId: ticket.groupId, userId: ticket.newUserId, firstName: newUser === null || newUser === void 0 ? void 0 : newUser.firstName, lastName: newUser === null || newUser === void 0 ? void 0 : newUser.lastName, slotNumber,
                }, {
                    joinMethod: 'migration',
                });
            });
        }
        else if (ticket.type === 'LEAVE_GROUP') {
            await this.prisma.$transaction(async (tx) => {
                const group = await tx.group.findUnique({ where: { id: ticket.groupId } });
                if (!group)
                    throw new common_1.NotFoundException('Group not found');
                if (group.status !== 'NOT_STARTED') {
                    throw new common_1.BadRequestException('Cannot leave a group that has already started. Please raise a dispute instead.');
                }
                await tx.groupContributor.deleteMany({
                    where: { groupId: ticket.groupId, userId: ticket.userId },
                });
                await tx.auditLog.create({
                    data: {
                        actorId: ticket.userId,
                        action: 'leave_group',
                        entityType: 'Group',
                        entityId: ticket.groupId,
                        metadata: { ticketId: ticket.id },
                    },
                });
            });
        }
    }
};
exports.TicketService = TicketService;
exports.TicketService = TicketService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TicketService);
//# sourceMappingURL=ticket.service.js.map