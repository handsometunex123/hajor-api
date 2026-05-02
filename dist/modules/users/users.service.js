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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const config_1 = require("@nestjs/config");
const redis_service_1 = require("../../infrastructure/redis/redis.service");
const kyc_service_1 = require("./kyc.service");
const fraud_service_1 = require("../fraud/fraud.service");
const queue_service_1 = require("../../infrastructure/queue/queue.service");
const crypto = __importStar(require("crypto"));
let UsersService = class UsersService {
    constructor(prisma, config, redis, kyc, fraud, queueService) {
        this.prisma = prisma;
        this.config = config;
        this.redis = redis;
        this.kyc = kyc;
        this.fraud = fraud;
        this.queueService = queueService;
        const rounds = parseInt(this.config.get('BCRYPT_SALT_ROUNDS', '12'), 10);
        this.saltRounds = Number.isNaN(rounds) ? 12 : rounds;
    }
    async getProfile(userId) {
        const key = `user:profile:${userId}`;
        try {
            const cached = await this.redis.get(key);
            if (cached)
                return cached;
        }
        catch (err) {
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                dob: true,
                address: true,
                trustScore: true,
                bvnVerified: true,
                createdAt: true,
                referralCode: true,
                notificationChannel: true,
                role: true,
                kycTier: true,
                bvnVerifiedAt: true,
                bvnVerificationRef: true,
                emailVerifiedAt: true,
                lastActiveAt: true,
            },
        });
        if (!user)
            return null;
        try {
            await this.redis.set(key, user, 60 * 5);
        }
        catch (err) {
        }
        return user;
    }
    async validateBvnForSignup(payload) {
        const result = await this.kyc.verifyBvn(payload.bvn, {
            firstName: payload.firstName,
            lastName: payload.lastName,
            dob: payload.dob,
            phone: payload.phone,
        });
        if (!(result === null || result === void 0 ? void 0 : result.success)) {
            throw new common_1.BadRequestException('BVN validation failed');
        }
        const normalize = (s) => (s || '').trim().toLowerCase();
        if (normalize(result.data.firstName) !== normalize(payload.firstName) ||
            normalize(result.data.lastName) !== normalize(payload.lastName) ||
            (payload.dob && result.data.dateOfBirth && normalize(result.data.dateOfBirth) !== normalize(payload.dob))) {
            throw new common_1.BadRequestException('Name or date of birth does not match BVN record');
        }
        const token = crypto.randomBytes(16).toString('hex');
        await this.redis.set(`bvn:signup:${token}`, JSON.stringify({
            bvn: payload.bvn,
            firstName: payload.firstName,
            lastName: payload.lastName,
            dob: payload.dob,
            phone: payload.phone,
            verificationId: result.data.verificationId,
        }), 300);
        console.log(await this.redis.get(`bvn:signup:${token}`));
        return { token };
    }
    async createUserWithBvnToken(data) {
        const tokenKey = `bvn:signup:${data.bvnValidationToken}`;
        const tokenDataRaw = await this.redis.get(tokenKey);
        console.log({ TAKES: tokenDataRaw, isString: typeof tokenDataRaw === 'string' });
        if (!tokenDataRaw) {
            throw new common_1.BadRequestException('BVN validation token is missing or expired. Please validate your BVN again.');
        }
        let tokenData;
        try {
            tokenData = typeof tokenDataRaw === 'string' ? JSON.parse(tokenDataRaw) : tokenDataRaw;
        }
        catch (err) {
            throw new common_1.BadRequestException('BVN validation token is invalid or corrupted. Please validate your BVN again.');
        }
        if (tokenData.bvn !== data.bvn ||
            tokenData.firstName !== data.firstName ||
            tokenData.lastName !== data.lastName ||
            tokenData.dob !== (data.dob instanceof Date ? data.dob.toISOString().slice(0, 10) : data.dob) ||
            tokenData.phone !== data.phone) {
            throw new common_1.BadRequestException('BVN validation token does not match provided details.');
        }
        await this.redis.del(tokenKey);
        const hashed = await bcrypt.hash(data.password, this.saltRounds);
        const hashedPin = await bcrypt.hash(data.transactionPin, this.saltRounds);
        function generateReferralCode() {
            return Math.random().toString(36).substring(2, 10).toUpperCase();
        }
        let uniqueReferralCode = null;
        for (let i = 0; i < 5; i++) {
            const code = generateReferralCode();
            const exists = await this.prisma.user.findFirst({ where: { referralCode: code } });
            if (!exists) {
                uniqueReferralCode = code;
                break;
            }
        }
        if (!uniqueReferralCode) {
            throw new Error('Failed to generate unique referral code');
        }
        let referredById = undefined;
        if (data.referralCode) {
            const referrer = await this.prisma.user.findFirst({ where: { referralCode: data.referralCode } });
            if (referrer) {
                referredById = referrer.id;
            }
        }
        const userData = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            password: hashed,
            transactionPin: hashedPin,
            dob: data.dob ? new Date(data.dob) : undefined,
            address: data.address,
            utilityBillUrl: data.utilityBillUrl,
            referralCode: uniqueReferralCode,
            referredById: referredById,
            bvnVerified: true,
            bvnVerifiedAt: new Date(),
            bvnVerificationRef: tokenData.verificationId,
            kycTier: 1,
        };
        try {
            const created = await this.prisma.$transaction(async (tx) => {
                await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                const user = await tx.user.create({ data: userData });
                await tx.wallet.create({ _internal: true, data: { userId: user.id } });
                await tx.auditLog.create({
                    data: {
                        actorId: user.id,
                        action: 'create_user',
                        entityType: 'User',
                        entityId: user.id,
                        metadata: { email: user.email, bvnVerificationRef: tokenData.verificationId, bvnVerified: true },
                    },
                });
                return user;
            });
            try {
                const wallet = await this.prisma.wallet.findUnique({ where: { userId: created.id } });
                if (wallet) {
                    await this.queueService.addNotificationJob('provision-virtual-account', {
                        walletId: wallet.id,
                        name: `${created.firstName} ${created.lastName}`,
                        email: created.email,
                    }, { attempts: 10, backoff: { type: 'exponential', delay: 3000 }, removeOnFail: false });
                }
            }
            catch (err) {
            }
            return created;
        }
        catch (err) {
            if ((err === null || err === void 0 ? void 0 : err.code) === 'P2002' || (err === null || err === void 0 ? void 0 : err.code) === '23505') {
                const existing = await this.prisma.user.findFirst({ where: { email: data.email } });
                if (existing)
                    return existing;
            }
            throw err;
        }
    }
    async listUsers(opts, access = {}) {
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (opts.search) {
            where.OR = [
                { firstName: { contains: opts.search, mode: 'insensitive' } },
                { lastName: { contains: opts.search, mode: 'insensitive' } },
                { email: { contains: opts.search, mode: 'insensitive' } },
                { phone: { contains: opts.search } },
            ];
        }
        if (!opts.includeUnverified) {
            where.bvnVerified = true;
        }
        if (opts.role) {
            where.role = opts.role;
        }
        if (access.excludeSuperAdmins) {
            where.role = { not: 'SUPER_ADMIN' };
        }
        const allowedSortFields = ['createdAt', 'firstName', 'lastName', 'email'];
        const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
        const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                select: { id: true, firstName: true, lastName: true, email: true, phone: true, bvnVerified: true, role: true, notificationChannel: true, createdAt: true },
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            items: users,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit) || 1,
            },
        };
    }
    async countAdminGroups(userId) {
        return this.prisma.group.count({ where: { adminId: userId } });
    }
    async completeInviteOnboarding(userId, data) {
        const tokenKey = `bvn:signup:${data.bvnValidationToken}`;
        const tokenDataRaw = await this.redis.get(tokenKey);
        if (!tokenDataRaw) {
            throw new common_1.BadRequestException('BVN validation token is missing or expired. Please validate your BVN again.');
        }
        let bvnTokenData;
        try {
            bvnTokenData = typeof tokenDataRaw === 'string' ? JSON.parse(tokenDataRaw) : tokenDataRaw;
        }
        catch (_a) {
            throw new common_1.BadRequestException('BVN validation token is invalid or corrupted. Please validate your BVN again.');
        }
        const proxyUser = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!proxyUser)
            throw new common_1.BadRequestException('User not found');
        const resolvedFirstName = data.firstName || proxyUser.firstName;
        const resolvedLastName = data.lastName || proxyUser.lastName;
        const resolvedPhone = data.phone || proxyUser.phone;
        if (bvnTokenData.bvn !== data.bvn ||
            bvnTokenData.firstName !== resolvedFirstName ||
            bvnTokenData.lastName !== resolvedLastName ||
            bvnTokenData.dob !== data.dob ||
            bvnTokenData.phone !== resolvedPhone) {
            throw new common_1.BadRequestException('BVN validation token does not match provided details.');
        }
        await this.redis.del(tokenKey);
        const result = await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
            const invite = await tx.invitation.findUnique({ where: { id: data.inviteId } });
            if (!invite)
                throw new Error('Invite not found');
            if (invite.userId !== userId)
                throw new Error('Not the invited user');
            if (invite.status === 'REJECTED')
                throw new Error('Invite was rejected');
            const hashed = await bcrypt.hash(data.password, this.saltRounds);
            const hashedPin = await bcrypt.hash(data.transactionPin, this.saltRounds);
            const updated = await tx.user.update({
                where: { id: userId },
                data: {
                    password: hashed,
                    transactionPin: hashedPin,
                    mustChangePassword: false,
                    phone: data.phone || undefined,
                    firstName: data.firstName || undefined,
                    lastName: data.lastName || undefined,
                    dob: data.dob ? new Date(data.dob) : undefined,
                    address: data.address || undefined,
                    utilityBillUrl: data.utilityBillUrl || undefined,
                    emailVerifiedAt: new Date(),
                    bvnVerified: true,
                    bvnVerifiedAt: new Date(),
                    bvnVerificationRef: bvnTokenData.verificationId,
                    kycTier: 1,
                    referredById: invite.invitedById,
                },
            });
            const existingWallet = await tx.wallet.findUnique({ where: { userId } });
            if (!existingWallet) {
                await tx.wallet.create({ _internal: true, data: { userId } });
            }
            try {
                await tx.invitation.update({ where: { id: data.inviteId }, data: { metadata: { ...invite.metadata, onboardedAt: new Date().toISOString() } } });
            }
            catch (err) {
            }
            await tx.auditLog.create({
                data: {
                    actorId: userId,
                    action: 'complete_onboard',
                    entityType: 'Invitation',
                    entityId: data.inviteId,
                    metadata: { userId },
                },
            });
            try {
                await this.redis.del(`user:profile:${userId}`);
            }
            catch (err) {
            }
            return { success: true, user: updated };
        });
        try {
            const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
            if (wallet) {
                await this.queueService.addNotificationJob('provision-virtual-account', {
                    walletId: wallet.id,
                    name: `${result.user.firstName} ${result.user.lastName}`,
                    email: result.user.email,
                }, { attempts: 10, backoff: { type: 'exponential', delay: 3000 }, removeOnFail: false });
            }
        }
        catch (err) {
        }
        return result;
    }
    async registerFromInvite(inviteId, data) {
        const tokenKey = `bvn:signup:${data.bvnValidationToken}`;
        const tokenDataRaw = await this.redis.get(tokenKey);
        if (!tokenDataRaw) {
            throw new common_1.BadRequestException('BVN validation token is missing or expired. Please validate your BVN again.');
        }
        let bvnTokenData;
        try {
            bvnTokenData = typeof tokenDataRaw === 'string' ? JSON.parse(tokenDataRaw) : tokenDataRaw;
        }
        catch (_a) {
            throw new common_1.BadRequestException('BVN validation token is invalid or corrupted. Please validate your BVN again.');
        }
        const inviteForBvn = await this.prisma.invitation.findUnique({ where: { id: inviteId } });
        if (!inviteForBvn)
            throw new common_1.BadRequestException('Invite not found');
        const metaForBvn = inviteForBvn.metadata || {};
        const resolvedFirstName = data.firstName || metaForBvn.invitedFirstName;
        const resolvedLastName = data.lastName || metaForBvn.invitedLastName;
        const resolvedPhone = data.phone || metaForBvn.invitedPhone;
        if (bvnTokenData.bvn !== data.bvn ||
            bvnTokenData.firstName !== resolvedFirstName ||
            bvnTokenData.lastName !== resolvedLastName ||
            bvnTokenData.dob !== data.dob ||
            bvnTokenData.phone !== resolvedPhone) {
            throw new common_1.BadRequestException('BVN validation token does not match provided details.');
        }
        await this.redis.del(tokenKey);
        const res = await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
            const invite = await tx.invitation.findUnique({ where: { id: inviteId } });
            if (!invite)
                throw new Error('Invite not found');
            if (invite.userId)
                throw new Error('Invite already linked to a user');
            const meta = invite.metadata || {};
            if (!meta.registrationToken || meta.registrationToken !== data.token)
                throw new Error('Invalid or missing registration token');
            if (meta.registrationTokenExpiresAt && new Date(meta.registrationTokenExpiresAt) < new Date())
                throw new Error('Registration token expired');
            const hashed = await bcrypt.hash(data.password, this.saltRounds);
            const hashedPin = await bcrypt.hash(data.transactionPin, this.saltRounds);
            const email = meta.invitedEmail;
            const firstName = resolvedFirstName || 'First';
            const lastName = resolvedLastName || 'Last';
            const phone = resolvedPhone || '';
            function generateReferralCode() {
                return Math.random().toString(36).substring(2, 10).toUpperCase();
            }
            let uniqueReferralCode = null;
            for (let i = 0; i < 5; i++) {
                const code = generateReferralCode();
                const exists = await tx.user.findFirst({ where: { referralCode: code } });
                if (!exists) {
                    uniqueReferralCode = code;
                    break;
                }
            }
            if (!uniqueReferralCode)
                throw new Error('Failed to generate unique referral code');
            const existingUser = await tx.user.findFirst({ where: { email } });
            let userId;
            if (existingUser) {
                userId = existingUser.id;
                const existingWallet = await tx.wallet.findUnique({ where: { userId } });
                if (!existingWallet) {
                    await tx.wallet.create({ _internal: true, data: { userId } });
                }
            }
            else {
                const user = await tx.user.create({
                    data: {
                        firstName, lastName, email: email || '', phone, password: hashed,
                        transactionPin: hashedPin,
                        address: data.address,
                        dob: data.dob ? new Date(data.dob) : undefined,
                        utilityBillUrl: data.utilityBillUrl,
                        emailVerifiedAt: new Date(),
                        bvnVerified: true,
                        bvnVerifiedAt: new Date(),
                        bvnVerificationRef: bvnTokenData.verificationId,
                        kycTier: 1,
                        referredById: invite.invitedById,
                        referralCode: uniqueReferralCode,
                    },
                });
                userId = user.id;
                await tx.wallet.create({ _internal: true, data: { userId } });
            }
            await tx.invitation.update({ where: { id: inviteId }, data: { userId, metadata: { ...meta, registeredAt: new Date().toISOString(), registrationToken: null, registrationTokenExpiresAt: null } } });
            await tx.auditLog.create({ data: { actorId: userId, action: 'register_from_invite', entityType: 'Invitation', entityId: inviteId, metadata: { inviteId, existingAccount: !!existingUser } } });
            const user = existingUser !== null && existingUser !== void 0 ? existingUser : await tx.user.findUnique({ where: { id: userId } });
            return { success: true, user };
        });
        try {
            const wallet = await this.prisma.wallet.findUnique({ where: { userId: res.user.id } });
            if (wallet) {
                await this.queueService.addNotificationJob('provision-virtual-account', {
                    walletId: wallet.id,
                    name: `${res.user.firstName} ${res.user.lastName}`,
                    email: res.user.email,
                }, { attempts: 10, backoff: { type: 'exponential', delay: 3000 }, removeOnFail: false });
            }
        }
        catch (err) {
        }
        try {
            await this.queueService.addNotificationJob('send-notification', {
                userId: res.user.id,
                type: 'REGISTRATION_COMPLETE',
                payload: { message: 'Your account has been created and identity verified successfully.' },
            });
        }
        catch (err) {
        }
        return res;
    }
    async upgradeProxyToUser(userId, adminId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (user.role !== 'PROXY')
            throw new common_1.BadRequestException('User is not a PROXY');
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { role: 'USER', notificationChannel: 'EMAIL' },
        });
        await this.prisma.auditLog.create({
            data: {
                actorId: adminId,
                action: 'upgrade_proxy_to_user',
                entityType: 'User',
                entityId: userId,
                metadata: { previousRole: 'PROXY' },
            },
        });
        try {
            await this.redis.del(`user:profile:${userId}`);
        }
        catch (_) { }
        return { ok: true, userId: updated.id, role: updated.role };
    }
    async validateBvnAndSet(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new Error('User not found');
        const payload = {
            firstName: dto.firstName || user.firstName,
            lastName: dto.lastName || user.lastName,
            phone: dto.phone || user.phone,
            dob: dto.dob || (user.dob ? user.dob.toISOString().slice(0, 10) : undefined),
        };
        const verificationResult = await this.kyc.verifyBvn(dto.bvn, payload);
        if (!verificationResult) {
            throw new common_1.BadRequestException('BVN verification failed: the provided BVN could not be verified against your profile');
        }
        await this.prisma.user.update({ where: { id: userId }, data: { bvnVerified: true, bvnVerifiedAt: new Date(), bvnVerificationRef: verificationResult.data.verificationId } });
        try {
            await this.redis.del(`user:profile:${userId}`);
        }
        catch (err) {
        }
        return { userId, bvnVerified: true };
    }
    async getMyGroups(userId, opts = {}) {
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 20;
        const groupWhere = {};
        if (opts.search)
            groupWhere.name = { contains: opts.search, mode: 'insensitive' };
        if (opts.status)
            groupWhere.status = opts.status;
        if (opts.frequency)
            groupWhere.frequency = opts.frequency;
        if (opts.isAdmin === true)
            groupWhere.adminId = userId;
        if (opts.isAdmin === false)
            groupWhere.adminId = { not: userId };
        const contributorSlots = await this.prisma.groupContributor.findMany({
            where: {
                userId,
                deletedAt: null,
                ...(Object.keys(groupWhere).length > 0 ? { group: groupWhere } : {}),
            },
            include: {
                group: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        status: true,
                        frequency: true,
                        contributionAmount: true,
                        maxSlots: true,
                        adminId: true,
                        createdAt: true,
                    },
                },
            },
        });
        const groupMap = new Map();
        for (const m of contributorSlots) {
            if (!groupMap.has(m.groupId)) {
                groupMap.set(m.groupId, { group: m.group, isAdmin: m.group.adminId === userId, slots: [] });
            }
            groupMap.get(m.groupId).slots.push({
                id: m.id,
                displayId: m.displayId,
                payoutOrder: m.payoutOrder,
                isActive: m.isActive,
                termsAcceptedAt: m.termsAcceptedAt,
                joinedAt: m.joinedAt,
            });
        }
        let items = Array.from(groupMap.values()).map(({ group, isAdmin, slots }) => ({ ...group, isAdmin, slots }));
        const allowedSortFields = ['name', 'createdAt', 'contributionAmount'];
        const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
        const sortDir = opts.sortOrder === 'asc' ? 1 : -1;
        items.sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            if (aVal < bVal)
                return -sortDir;
            if (aVal > bVal)
                return sortDir;
            return 0;
        });
        const total = items.length;
        const pages = Math.ceil(total / limit) || 1;
        items = items.slice((page - 1) * limit, page * limit);
        return { items, pagination: { total, page, limit, pages } };
    }
    async verifyTransactionPin(userId, pin) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { transactionPin: true } });
        if (!(user === null || user === void 0 ? void 0 : user.transactionPin))
            return false;
        return bcrypt.compare(pin, user.transactionPin);
    }
    async changeTransactionPin(userId, currentPin, newPin) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { transactionPin: true } });
        if (!(user === null || user === void 0 ? void 0 : user.transactionPin)) {
            throw new common_1.BadRequestException('No transaction PIN is set on this account');
        }
        const isMatch = await bcrypt.compare(currentPin, user.transactionPin);
        if (!isMatch) {
            throw new common_1.BadRequestException('Current PIN is incorrect');
        }
        const hashedPin = await bcrypt.hash(newPin, this.saltRounds);
        await this.prisma.user.update({ where: { id: userId }, data: { transactionPin: hashedPin } });
        return { ok: true };
    }
    async resetTransactionPin(userId, password, newPin) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new common_1.BadRequestException('Incorrect password');
        }
        const hashedPin = await bcrypt.hash(newPin, this.saltRounds);
        await this.prisma.user.update({ where: { id: userId }, data: { transactionPin: hashedPin } });
        return { ok: true };
    }
    async getReferralStats(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const baseWhere = { referredById: userId, deletedAt: null };
        const [totalReferrals, onboardedReferrals] = await Promise.all([
            this.prisma.user.count({ where: baseWhere }),
            this.prisma.user.count({ where: { ...baseWhere, bvnVerified: true, kycTier: 1 } }),
        ]);
        return {
            referralCode: user.referralCode,
            totalReferrals,
            onboardedReferrals,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        redis_service_1.RedisService,
        kyc_service_1.KycService,
        fraud_service_1.FraudService,
        queue_service_1.QueueService])
], UsersService);
//# sourceMappingURL=users.service.js.map