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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const config_1 = require("@nestjs/config");
const redis_service_1 = require("../../infrastructure/redis/redis.service");
const queue_service_1 = require("../../infrastructure/queue/queue.service");
let AuthService = class AuthService {
    constructor(prisma, jwt, config, redis, queue) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
        this.redis = redis;
        this.queue = queue;
        this.refreshTtlDays = parseInt(this.config.get('REFRESH_TOKEN_DAYS', '30'), 10);
        this.accessTokenTtlSeconds = parseInt(this.config.get('ACCESS_TOKEN_TTL_SECONDS', (15 * 60).toString()), 10);
    }
    async validateUser(email, pass) {
        const user = await this.prisma.user.findFirst({ where: { email } });
        if (!user)
            return null;
        const ok = await bcrypt.compare(pass, user.password);
        if (!ok)
            return null;
        delete user.password;
        return user;
    }
    signAccessToken(user) {
        const role = user.role || 'USER';
        const payload = { sub: user.id, email: user.email, role };
        return this.jwt.sign(payload, { expiresIn: `${this.accessTokenTtlSeconds}s` });
    }
    genRefreshToken() {
        return (0, crypto_1.randomBytes)(64).toString('hex');
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    async authenticate(email, password) {
        var _a;
        const user = await this.validateUser(email, password);
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const accessToken = this.signAccessToken(user);
        const refreshToken = this.genRefreshToken();
        const refreshHash = this.hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
        await this.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: refreshHash, expiresAt } });
        try {
            const seconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
            await this.redis.set(`rt:${refreshHash}`, 'active', seconds);
        }
        catch (err) {
        }
        return { accessToken, refreshToken, refreshTokenExpiresAt: expiresAt, mustChangePassword: (_a = user.mustChangePassword) !== null && _a !== void 0 ? _a : false };
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid)
            throw new common_1.UnauthorizedException('Current password is incorrect');
        const hashed = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({ where: { id: userId }, data: { password: hashed, mustChangePassword: false } });
        return { success: true };
    }
    async rotateRefreshToken(presented, req) {
        const hash = this.hashToken(presented);
        try {
            const status = await this.redis.get(`rt:${hash}`);
            if (status === 'revoked') {
                const rtDb = await this.prisma.refreshToken.findFirst({ where: { tokenHash: hash } });
                if (rtDb)
                    await this.prisma.refreshToken.updateMany({ where: { userId: rtDb.userId }, data: { revoked: true } });
                throw new common_1.UnauthorizedException('Refresh token revoked');
            }
        }
        catch (err) {
        }
        const rt = await this.prisma.refreshToken.findFirst({ where: { tokenHash: hash } });
        if (!rt) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (rt.revoked) {
            await this.prisma.refreshToken.updateMany({ where: { userId: rt.userId }, data: { revoked: true } });
            try {
                await this.redis.set(`rt:${hash}`, 'revoked', 60);
            }
            catch (_) { }
            throw new common_1.UnauthorizedException('Refresh token revoked');
        }
        if (rt.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Refresh token expired');
        }
        const newToken = this.genRefreshToken();
        const newHash = this.hashToken(newToken);
        const expiresAt = new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
        await this.prisma.$transaction(async (tx) => {
            await tx.refreshToken.update({ where: { id: rt.id }, data: { revoked: true, replacedBy: undefined } });
            const created = await tx.refreshToken.create({ data: { userId: rt.userId, tokenHash: newHash, expiresAt } });
            await tx.refreshToken.update({ where: { id: rt.id }, data: { replacedBy: created.id } });
        });
        try {
            const oldKey = `rt:${hash}`;
            const newKey = `rt:${newHash}`;
            await this.redis.set(oldKey, 'revoked', 60);
            const seconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
            await this.redis.set(newKey, 'active', seconds);
        }
        catch (err) {
        }
        const user = await this.prisma.user.findUnique({ where: { id: rt.userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const accessToken = this.signAccessToken(user);
        return { accessToken, refreshToken: newToken, refreshTokenExpiresAt: expiresAt };
    }
    async revokeRefreshToken(presented) {
        const hash = this.hashToken(presented);
        await this.prisma.refreshToken.updateMany({ where: { tokenHash: hash }, data: { revoked: true } });
        return { ok: true };
    }
    async requestPasswordReset(email) {
        const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
        if (!user)
            return { ok: true };
        const otp = (0, crypto_1.randomInt)(100000, 999999).toString();
        const key = `pwd_reset:${email.toLowerCase()}`;
        await this.redis.set(key, otp, 600);
        try {
            await this.queue.addNotificationJob('send-notification', {
                userId: user.id,
                type: 'PASSWORD_RESET',
                payload: { otp, email },
            });
        }
        catch (err) {
        }
        return { ok: true };
    }
    async confirmPasswordReset(email, otp, newPassword) {
        const key = `pwd_reset:${email.toLowerCase()}`;
        const stored = await this.redis.get(key);
        const storedString = stored ? stored.toString() : null;
        if (!storedString || storedString !== otp) {
            throw new common_1.BadRequestException('Invalid or expired OTP');
        }
        const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
        if (!user)
            throw new common_1.BadRequestException('Invalid or expired OTP');
        const hashed = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
        await this.prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revoked: true } });
        try {
            await this.redis.del(key);
        }
        catch (_) { }
        await this.prisma.auditLog.create({
            data: {
                actorId: user.id,
                action: 'password_reset',
                entityType: 'User',
                entityId: user.id,
                metadata: { email },
            },
        });
        return { ok: true };
    }
    async requestEmailVerification(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (user.emailVerifiedAt)
            return { ok: true };
        const otp = (0, crypto_1.randomInt)(100000, 999999).toString();
        const key = `email_verify:${userId}`;
        await this.redis.set(key, otp, 600);
        try {
            await this.queue.addNotificationJob('send-notification', {
                userId,
                type: 'EMAIL_VERIFICATION',
                payload: { otp, email: user.email },
            });
        }
        catch (err) {
        }
        return { ok: true };
    }
    async confirmEmailVerification(userId, otp) {
        const key = `email_verify:${userId}`;
        const stored = await this.redis.get(key);
        const storedString = stored ? stored.toString() : null;
        if (!storedString || storedString !== otp) {
            throw new common_1.BadRequestException('Invalid or expired OTP');
        }
        await this.prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
        try {
            await this.redis.del(key);
        }
        catch (_) { }
        await this.prisma.auditLog.create({
            data: {
                actorId: userId,
                action: 'email_verified',
                entityType: 'User',
                entityId: userId,
                metadata: {},
            },
        });
        return { ok: true };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        redis_service_1.RedisService,
        queue_service_1.QueueService])
], AuthService);
//# sourceMappingURL=auth.service.js.map