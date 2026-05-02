"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupInviteService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const queue_service_1 = require("../../infrastructure/queue/queue.service");
const redis_service_1 = require("../../infrastructure/redis/redis.service");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const generate_display_id_1 = require("../../common/utils/generate-display-id");
let GroupInviteService = class GroupInviteService {
    constructor(prisma, notifications, queueService, redis, config) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.queueService = queueService;
        this.redis = redis;
        this.config = config;
        const rounds = parseInt(this.config.get('BCRYPT_SALT_ROUNDS', '12'), 10);
        this.saltRounds = Number.isNaN(rounds) ? 12 : rounds;
    }
    async getInviteById(inviteId) {
        return this.prisma.invitation.findUnique({ where: { id: inviteId } });
    }
    async createContactInvite(adminId, groupId, contact) {
        const { firstName, lastName, email, phone } = contact;
        return this.prisma.$transaction(async (tx) => {
            const group = await tx.group.findUnique({ where: { id: groupId } });
            if (!group)
                throw new common_1.NotFoundException('Group not found');
            if (group.frozenAt)
                throw new common_1.BadRequestException('Group is frozen \u2014 no mutations allowed');
            if (group.adminId !== adminId)
                throw new common_1.BadRequestException('Only admin can invite');
            if (group.status !== 'NOT_STARTED')
                throw new common_1.BadRequestException('Cannot invite after group has started');
            const total = await tx.groupContributor.count({ where: { groupId } });
            if (total >= group.maxSlots)
                throw new common_1.BadRequestException('Group is full');
            const existing = await tx.invitation.findFirst({ where: { groupId, metadata: { path: ['invitedEmail'], equals: email }, status: 'PENDING' } });
            if (existing)
                throw new common_1.BadRequestException('Invite already pending for this contact');
            const token = (0, crypto_1.randomBytes)(24).toString('hex');
            const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            const invite = await tx.invitation.create({
                data: {
                    groupId,
                    invitedById: adminId,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    metadata: { invitedFirstName: firstName, invitedLastName: lastName, invitedEmail: email, invitedPhone: phone, registrationToken: token, registrationTokenExpiresAt: tokenExpiresAt },
                },
            });
            try {
                await this.queueService.addNotificationJob('send-invite-email', {
                    inviteId: invite.id,
                    email,
                    firstName,
                    lastName,
                    token,
                });
            }
            catch (err) {
            }
            return invite;
        });
    }
    async verifyContactInvite(_inviteId, _otp) {
        throw new common_1.BadRequestException('OTP-based invite verification is deprecated. Use email registration link flow.');
    }
    async createInvite(adminId, groupId, userId) {
        return this.prisma.$transaction(async (tx) => {
            const group = await tx.group.findUnique({ where: { id: groupId } });
            if (!group)
                throw new common_1.NotFoundException('Group not found');
            if (group.frozenAt)
                throw new common_1.BadRequestException('Group is frozen \u2014 no mutations allowed');
            if (group.adminId !== adminId)
                throw new common_1.BadRequestException('Only admin can invite');
            if (group.status !== 'NOT_STARTED')
                throw new common_1.BadRequestException('Cannot invite after group has started');
            const total = await tx.groupContributor.count({ where: { groupId } });
            if (total >= group.maxSlots)
                throw new common_1.BadRequestException('Group is full');
            const existing = await tx.invitation.findFirst({ where: { groupId, userId, status: 'PENDING' } });
            if (existing)
                throw new common_1.BadRequestException('Invite already pending');
            const invitee = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
            if (!invitee)
                throw new common_1.BadRequestException('User not found — check the userId and try again');
            const alreadyContributor = await tx.groupContributor.findFirst({ where: { groupId, userId, deletedAt: null } });
            if (alreadyContributor)
                throw new common_1.BadRequestException('This user is already a contributor in the group');
            const invite = await tx.invitation.create({ data: { groupId, userId, invitedById: adminId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
            try {
                if (userId) {
                    const grp = await tx.group.findUnique({ where: { id: groupId } });
                    await this.notifications.sendNotification({ userId, type: 'GROUP_INVITE', title: `You've been invited to ${grp === null || grp === void 0 ? void 0 : grp.name}`, message: `You have an invite to join group ${grp === null || grp === void 0 ? void 0 : grp.name}`, payload: { groupId } });
                }
            }
            catch (err) {
            }
            return invite;
        });
    }
    async upsertJoinLink(adminId, groupId) {
        const token = (0, crypto_1.randomBytes)(16).toString('hex');
        return this.prisma.$transaction(async (tx) => {
            const group = await tx.group.findUnique({ where: { id: groupId } });
            if (!group)
                throw new common_1.NotFoundException('Group not found');
            if (group.adminId !== adminId)
                throw new common_1.BadRequestException('Only admin can manage the join link');
            await tx.joinLink.deleteMany({ where: { groupId, reusable: true } });
            const link = await tx.joinLink.create({ data: { groupId, token, createdById: adminId, reusable: true } });
            return link;
        });
    }
    async getJoinLink(actorId, groupId) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        const isAdmin = group.adminId === actorId;
        const isContributor = await this.prisma.groupContributor.findFirst({ where: { groupId, userId: actorId } });
        if (!isAdmin && !isContributor)
            throw new common_1.BadRequestException('Only group contributors can retrieve join link');
        const link = await this.prisma.joinLink.findFirst({ where: { groupId, reusable: true } });
        if (!link)
            throw new common_1.NotFoundException('Join link not found');
        return link;
    }
    async consumeJoinLink(userId, token) {
        return this.prisma.$transaction(async (tx) => {
            const link = await tx.joinLink.findUnique({ where: { token } });
            if (!link)
                throw new common_1.NotFoundException('Join link not found');
            if (!link.isActive)
                throw new common_1.BadRequestException('Join link is paused');
            const group = await tx.group.findUnique({ where: { id: link.groupId } });
            if (!group)
                throw new common_1.NotFoundException('Group not found');
            if (group.frozenAt)
                throw new common_1.BadRequestException('Group is frozen \u2014 no mutations allowed');
            if (group.status !== 'NOT_STARTED')
                throw new common_1.BadRequestException('Cannot join after group has started');
            const existing = await tx.invitation.findFirst({ where: { groupId: group.id, userId, status: 'PENDING' } });
            if (existing)
                return existing;
            const invite = await tx.invitation.create({ data: { groupId: group.id, userId, invitedById: link.createdById } });
            return invite;
        });
    }
    async pauseJoinLink(adminId, groupId) {
        return this.prisma.$transaction(async (tx) => {
            const group = await tx.group.findUnique({ where: { id: groupId } });
            if (!group)
                throw new common_1.NotFoundException('Group not found');
            if (group.adminId !== adminId)
                throw new common_1.BadRequestException('Only admin can pause join link');
            await tx.joinLink.updateMany({ where: { groupId, reusable: true }, data: { isActive: false, pausedAt: new Date(), pausedById: adminId } });
            return { success: true };
        });
    }
    async resumeJoinLink(adminId, groupId) {
        return this.prisma.$transaction(async (tx) => {
            const group = await tx.group.findUnique({ where: { id: groupId } });
            if (!group)
                throw new common_1.NotFoundException('Group not found');
            if (group.adminId !== adminId)
                throw new common_1.BadRequestException('Only admin can resume join link');
            await tx.joinLink.updateMany({ where: { groupId, reusable: true }, data: { isActive: true, pausedAt: null, pausedById: null } });
            return { success: true };
        });
    }
    async revokeJoinLink(adminId, groupId) {
        return this.prisma.$transaction(async (tx) => {
            const group = await tx.group.findUnique({ where: { id: groupId } });
            if (!group)
                throw new common_1.NotFoundException('Group not found');
            if (group.adminId !== adminId)
                throw new common_1.BadRequestException('Only admin can revoke join link');
            await tx.joinLink.deleteMany({ where: { groupId, reusable: true } });
            return { success: true };
        });
    }
    async proxyRegisterInit(adminId, groupId, data) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.frozenAt)
            throw new common_1.BadRequestException('Group is frozen \u2014 no mutations allowed');
        if (group.adminId !== adminId)
            throw new common_1.BadRequestException('Only the group admin can register proxy users');
        if (group.status !== 'NOT_STARTED')
            throw new common_1.BadRequestException('Cannot add contributors after group has started');
        const total = await this.prisma.groupContributor.count({ where: { groupId } });
        if (total >= group.maxSlots)
            throw new common_1.BadRequestException('Group is full');
        const phoneExists = await this.prisma.user.findFirst({ where: { phone: data.phone, deletedAt: null } });
        if (phoneExists)
            throw new common_1.BadRequestException('A user with this phone number already exists in the system');
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const redisKey = `proxy_reg:${data.phone}`;
        await this.redis.set(redisKey, { otp, firstName: data.firstName, lastName: data.lastName, phone: data.phone, email: data.email || null, groupId, adminId }, 600);
        try {
            await this.queueService.addNotificationJob('send-sms', {
                phone: data.phone,
                message: `Hello ${data.firstName}, your Hajor group registration code is: ${otp}. Read this code to your group admin to complete joining. Expires in 10 minutes.`,
            });
        }
        catch (_) { }
        return { message: 'OTP sent to user phone', phone: data.phone, expiresInSeconds: 600 };
    }
    async proxyRegisterConfirm(adminId, groupId, data) {
        const redisKey = `proxy_reg:${data.phone}`;
        const stored = await this.redis.get(redisKey);
        if (!stored)
            throw new common_1.BadRequestException('OTP expired or not found. Please initiate registration again.');
        if (stored.otp !== data.otp)
            throw new common_1.BadRequestException('Invalid OTP');
        if (stored.groupId !== groupId)
            throw new common_1.BadRequestException('OTP was not issued for this group');
        if (stored.adminId !== adminId)
            throw new common_1.BadRequestException('You did not initiate this registration');
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.frozenAt)
            throw new common_1.BadRequestException('Group is frozen \u2014 no mutations allowed');
        if (group.status !== 'NOT_STARTED')
            throw new common_1.BadRequestException('Can only add contributors while group is NOT_STARTED');
        const totalContributors = await this.prisma.groupContributor.count({ where: { groupId } });
        if (totalContributors >= group.maxSlots)
            throw new common_1.BadRequestException('Group is already full');
        const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        const tempPassword = Array.from({ length: 10 }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
        const hashed = await bcrypt.hash(tempPassword, this.saltRounds);
        const email = stored.email || `proxy.${data.phone.replace(/\D/g, '')}@internal.hajor.app`;
        const { user, contributor } = await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
            const phoneExists = await tx.user.findFirst({ where: { phone: data.phone, deletedAt: null } });
            if (phoneExists)
                throw new common_1.BadRequestException('A user with this phone already exists');
            const u = await tx.user.create({
                data: {
                    firstName: stored.firstName,
                    lastName: stored.lastName,
                    email,
                    phone: data.phone,
                    password: hashed,
                    role: client_1.UserRole.PROXY,
                    notificationChannel: 'SMS',
                    mustChangePassword: true,
                },
            });
            await tx.wallet.create({ _internal: true, data: { userId: u.id } });
            const userSlotCount = await tx.groupContributor.count({ where: { groupId: group.id, userId: u.id } });
            const totalSlots = await tx.groupContributor.count({ where: { groupId: group.id } });
            const slotNumber = userSlotCount + 1;
            const contributor = await (0, generate_display_id_1.createContributorWithDisplayId)(tx, {
                groupId: group.id, userId: u.id, firstName: u.firstName, lastName: u.lastName, slotNumber,
            }, {
                joinMethod: 'invitation',
                payoutOrder: totalSlots + 1,
            });
            return { user: u, contributor };
        });
        try {
            await this.redis.del(redisKey);
        }
        catch (_) { }
        try {
            const wallet = await this.prisma.wallet.findUnique({ where: { userId: user.id } });
            if (wallet) {
                await this.queueService.addNotificationJob('provision-virtual-account', {
                    walletId: wallet.id, name: `${user.firstName} ${user.lastName}`, email,
                }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 } });
            }
        }
        catch (_) { }
        try {
            await this.queueService.addNotificationJob('send-sms', {
                phone: data.phone,
                message: `Welcome to Hajor! You have been added to group "${group.name}". Login email: ${email}. Temporary password: ${tempPassword}. Please change your password after your first login.`,
            });
        }
        catch (_) { }
        return {
            message: 'Proxy user registered and added to group',
            userId: user.id,
            contributorId: contributor.id,
            loginEmail: email,
        };
    }
    async listMyInvites(userId, opts = {}) {
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 200) : 50;
        const skip = (page - 1) * limit;
        const allowedSortFields = ['createdAt', 'status'];
        const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
        const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';
        const where = { userId };
        if (opts.status)
            where.status = opts.status;
        const [items, total] = await Promise.all([
            this.prisma.invitation.findMany({
                where,
                include: {
                    group: { select: { id: true, name: true, contributionAmount: true, frequency: true, status: true } },
                    invitedBy: { select: { id: true, firstName: true, lastName: true } },
                },
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.prisma.invitation.count({ where }),
        ]);
        return { items, pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } };
    }
    async listPendingInvites(adminId, groupId, opts = {}) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.adminId !== adminId)
            throw new common_1.BadRequestException('Only admin can list invites');
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 200) : 50;
        const skip = (page - 1) * limit;
        const allowedSortFields = ['createdAt', 'status'];
        const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
        const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';
        const where = { groupId, status: 'PENDING' };
        if (opts.search) {
            where.user = { OR: [
                    { firstName: { contains: opts.search, mode: 'insensitive' } },
                    { lastName: { contains: opts.search, mode: 'insensitive' } },
                    { email: { contains: opts.search, mode: 'insensitive' } },
                ] };
        }
        const [invites, total] = await Promise.all([
            this.prisma.invitation.findMany({
                where,
                include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }, invitedBy: { select: { id: true, firstName: true, lastName: true } } },
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.prisma.invitation.count({ where }),
        ]);
        return { items: invites, pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } };
    }
    async acceptInvite(userId, inviteId) {
        return this.prisma.$transaction(async (tx) => {
            const invite = await tx.invitation.findUnique({ where: { id: inviteId } });
            if (!invite)
                throw new common_1.NotFoundException('Invite not found');
            if (invite.status !== 'PENDING')
                throw new common_1.BadRequestException('Invitation is no longer pending');
            if (invite.expiresAt && invite.expiresAt < new Date())
                throw new common_1.BadRequestException('Invitation has expired');
            if (invite.userId !== userId)
                throw new common_1.BadRequestException('Not invited user');
            const group = await tx.group.findUnique({ where: { id: invite.groupId } });
            if (!group)
                throw new common_1.NotFoundException('Group not found');
            if (group.frozenAt)
                throw new common_1.BadRequestException('Group is frozen \u2014 no mutations allowed');
            if (group.status !== 'NOT_STARTED')
                throw new common_1.BadRequestException('Cannot accept invite after group start');
            const total = await tx.groupContributor.count({ where: { groupId: group.id } });
            if (total >= group.maxSlots)
                throw new common_1.BadRequestException('Group is full');
            const userSlots = await tx.groupContributor.count({ where: { groupId: group.id, userId } });
            if (userSlots >= 2)
                throw new common_1.BadRequestException('User already has maximum contributors in this group');
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const contributor = await (0, generate_display_id_1.createContributorWithDisplayId)(tx, {
                groupId: group.id, userId, firstName: user.firstName, lastName: user.lastName, slotNumber: userSlots + 1,
            }, {
                joinMethod: 'invitation',
                payoutOrder: total + 1,
            });
            await tx.invitation.update({ where: { id: inviteId }, data: { status: 'APPROVED' } });
            try {
                const adminId = group.adminId;
                await this.notifications.sendNotification({ userId: adminId, type: 'INVITE_ACCEPTED', title: `Invite accepted`, message: `User accepted invitation for group ${group.name}`, payload: { groupId: group.id, userId } });
            }
            catch (err) {
            }
            return { contributor };
        });
    }
    async rejectInvite(userId, inviteId) {
        const invite = await this.prisma.invitation.findUnique({ where: { id: inviteId } });
        if (!invite)
            throw new common_1.NotFoundException('Invite not found');
        if (invite.status !== 'PENDING')
            throw new common_1.BadRequestException('Invitation is no longer pending');
        if (invite.userId !== userId)
            throw new common_1.BadRequestException('Not invited user');
        await this.prisma.invitation.update({ where: { id: inviteId }, data: { status: 'REJECTED' } });
        return { success: true };
    }
};
exports.GroupInviteService = GroupInviteService;
exports.GroupInviteService = GroupInviteService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        queue_service_1.QueueService,
        redis_service_1.RedisService,
        config_1.ConfigService])
], GroupInviteService);
//# sourceMappingURL=group-invite.service.js.map