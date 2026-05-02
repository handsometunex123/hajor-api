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
exports.GroupJoinService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const advisory_lock_1 = require("../../infrastructure/db/advisory-lock");
const generate_display_id_1 = require("../../common/utils/generate-display-id");
const client_1 = require("@prisma/client");
let GroupJoinService = class GroupJoinService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async listJoinRequests(actorId, groupId, status) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.adminId !== actorId)
            throw new common_1.BadRequestException('Only admin can view join requests');
        const where = { groupId };
        if (status && Object.values(client_1.JoinRequestStatus).includes(status)) {
            where.status = status;
        }
        return this.prisma.groupJoinRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        });
    }
    async requestToJoin(userId, groupId, acceptTerms) {
        if (!acceptTerms)
            throw new common_1.BadRequestException('You must accept the group terms and conditions to join.');
        return this.prisma.$transaction(async (tx) => {
            const group = await tx.group.findUnique({ where: { id: groupId } });
            if (!group)
                throw new common_1.NotFoundException('Group not found');
            if (group.frozenAt)
                throw new common_1.BadRequestException('Group is frozen — no mutations allowed');
            if (group.status !== 'NOT_STARTED')
                throw new common_1.BadRequestException('Cannot request to join after group has started');
            const alreadyContributor = await tx.groupContributor.findFirst({ where: { groupId, userId } });
            if (alreadyContributor)
                throw new common_1.BadRequestException('User is already a contributor');
            const existingReq = await tx.groupJoinRequest.findFirst({ where: { groupId, userId, status: 'PENDING' } });
            if (existingReq)
                throw new common_1.BadRequestException('Join request already pending');
            const req = await tx.groupJoinRequest.create({ data: { groupId, userId, acceptedTerms: true } });
            return req;
        });
    }
    async approveJoinRequest(adminId, requestId, acceptIndemnity) {
        if (!acceptIndemnity)
            throw new common_1.BadRequestException('Admin must accept indemnity for the new user before approval.');
        return this.prisma.$transaction(async (tx) => {
            var _a;
            let req;
            try {
                const maybeReq = await tx.groupJoinRequest.findUnique({ where: { id: requestId } });
                if (maybeReq)
                    await (0, advisory_lock_1.acquireAdvisoryXactLock)(tx, maybeReq.groupId);
                req = maybeReq;
            }
            catch (err) {
                req = await tx.groupJoinRequest.findUnique({ where: { id: requestId } });
            }
            if (!req)
                throw new common_1.NotFoundException('Join request not found');
            if (req.status !== 'PENDING') {
                throw new common_1.BadRequestException('Join request has already been processed.');
            }
            const group = await tx.group.findUnique({ where: { id: req.groupId } });
            if (!group)
                throw new common_1.NotFoundException('Group not found');
            if (group.frozenAt)
                throw new common_1.BadRequestException('Group is frozen — no mutations allowed');
            if (group.adminId !== adminId)
                throw new common_1.BadRequestException('Only admin can approve requests');
            if (group.status !== 'NOT_STARTED')
                throw new common_1.BadRequestException('Cannot approve join requests after group has started');
            const total = await tx.groupContributor.count({ where: { groupId: group.id } });
            if (total >= group.maxSlots)
                throw new common_1.BadRequestException('Group is full');
            const userSlots = await tx.groupContributor.count({ where: { groupId: group.id, userId: req.userId } });
            if (userSlots >= 2)
                throw new common_1.BadRequestException('User already has maximum contributors in this group');
            const joiner = await tx.user.findUnique({ where: { id: req.userId } });
            const contributor = await (0, generate_display_id_1.createContributorWithDisplayId)(tx, {
                groupId: group.id,
                userId: req.userId,
                firstName: joiner === null || joiner === void 0 ? void 0 : joiner.firstName,
                lastName: joiner === null || joiner === void 0 ? void 0 : joiner.lastName,
                slotNumber: userSlots + 1,
            }, {
                termsAcceptedAt: new Date(),
                termsVersionAccepted: (_a = group.termsVersion) !== null && _a !== void 0 ? _a : 1,
                joinMethod: 'join_request',
                payoutOrder: total + 1,
            });
            await tx.groupJoinRequest.update({ where: { id: requestId }, data: { status: 'APPROVED', adminAcceptedIndemnity: true } });
            try {
                await this.notifications.sendNotification({ userId: group.adminId, type: 'JOIN_APPROVED', title: 'Join request approved', message: `A join request was approved for group ${group.name}`, payload: { groupId: group.id, userId: req.userId } });
            }
            catch (err) {
            }
            return { contributor };
        });
    }
    async rejectJoinRequest(adminId, requestId) {
        const req = await this.prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
        if (!req)
            throw new common_1.NotFoundException('Join request not found');
        const group = await this.prisma.group.findUnique({ where: { id: req.groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.adminId !== adminId)
            throw new common_1.BadRequestException('Only admin can reject requests');
        await this.prisma.groupJoinRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
        return { success: true };
    }
};
exports.GroupJoinService = GroupJoinService;
exports.GroupJoinService = GroupJoinService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notifications_service_1.NotificationsService])
], GroupJoinService);
//# sourceMappingURL=group-join.service.js.map