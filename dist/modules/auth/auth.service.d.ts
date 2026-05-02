import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly config;
    private readonly redis;
    private readonly queue;
    private readonly refreshTtlDays;
    private readonly accessTokenTtlSeconds;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService, redis: RedisService, queue: QueueService);
    validateUser(email: string, pass: string): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        dob: Date | null;
        password: string;
        transactionPin: string | null;
        address: string | null;
        utilityBillUrl: string | null;
        trustScore: number;
        bvnVerified: boolean;
        bvnVerifiedAt: Date | null;
        bvnVerificationRef: string | null;
        kycTier: number | null;
        emailVerifiedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        lastActiveAt: Date | null;
        role: import(".prisma/client").UserRole;
        notificationChannel: string;
        mustChangePassword: boolean;
        referralCode: string | null;
        referredById: string | null;
    }, unknown> & {}>;
    private signAccessToken;
    private genRefreshToken;
    private hashToken;
    authenticate(email: string, password: string): Promise<{
        accessToken: string;
        refreshToken: string;
        refreshTokenExpiresAt: Date;
        mustChangePassword: any;
    }>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        success: boolean;
    }>;
    rotateRefreshToken(presented: string, req?: Request): Promise<{
        accessToken: string;
        refreshToken: string;
        refreshTokenExpiresAt: Date;
    }>;
    revokeRefreshToken(presented: string): Promise<{
        ok: boolean;
    }>;
    requestPasswordReset(email: string): Promise<{
        ok: boolean;
    }>;
    confirmPasswordReset(email: string, otp: string, newPassword: string): Promise<{
        ok: boolean;
    }>;
    requestEmailVerification(userId: string): Promise<{
        ok: boolean;
    }>;
    confirmEmailVerification(userId: string, otp: string): Promise<{
        ok: boolean;
    }>;
}
