import { UserRole } from '@prisma/client';
import { GroupStatus, Frequency } from '../../common/enums';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { KycService } from './kyc.service';
import { FraudService } from '../fraud/fraud.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
export declare class UsersService {
    private readonly prisma;
    private readonly config;
    private readonly redis;
    private readonly kyc;
    private readonly fraud;
    private readonly queueService;
    private readonly saltRounds;
    constructor(prisma: PrismaService, config: ConfigService, redis: RedisService, kyc: KycService, fraud: FraudService, queueService: QueueService);
    getProfile(userId: string): Promise<any>;
    validateBvnForSignup(payload: {
        bvn: string;
        firstName: string;
        lastName: string;
        dob: string;
        phone: string;
    }): Promise<{
        token: string;
    }>;
    createUserWithBvnToken(data: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        password: string;
        transactionPin: string;
        dob?: Date;
        address?: string;
        utilityBillUrl?: string;
        referralCode?: string;
        bvn: string;
        bvnValidationToken: string;
    }): Promise<import("@prisma/client/runtime").GetResult<{
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
        role: UserRole;
        notificationChannel: string;
        mustChangePassword: boolean;
        referralCode: string | null;
        referredById: string | null;
    }, unknown> & {}>;
    listUsers(opts: {
        page?: number;
        limit?: number;
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        role?: UserRole;
        includeUnverified?: boolean;
    }, access?: {
        excludeSuperAdmins?: boolean;
    }): Promise<{
        items: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
            bvnVerified: boolean;
            role: UserRole;
            notificationChannel: string;
            createdAt: Date;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    countAdminGroups(userId: string): Promise<number>;
    completeInviteOnboarding(userId: string, data: {
        inviteId: string;
        password: string;
        transactionPin: string;
        bvn: string;
        bvnValidationToken: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
        dob?: string;
        address?: string;
        utilityBillUrl?: string;
    }): Promise<{
        success: boolean;
        user: any;
    }>;
    registerFromInvite(inviteId: string, data: {
        token: string;
        password: string;
        transactionPin: string;
        phone: string;
        bvn: string;
        bvnValidationToken: string;
        firstName?: string;
        lastName?: string;
        dob?: string;
        address?: string;
        utilityBillUrl?: string;
    }): Promise<{
        success: boolean;
        user: import("@prisma/client/runtime").GetResult<{
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
            role: UserRole;
            notificationChannel: string;
            mustChangePassword: boolean;
            referralCode: string | null;
            referredById: string | null;
        }, unknown> & {};
    }>;
    upgradeProxyToUser(userId: string, adminId: string): Promise<{
        ok: boolean;
        userId: string;
        role: UserRole;
    }>;
    validateBvnAndSet(userId: string, dto: {
        bvn: string;
        dob?: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
    }): Promise<{
        userId: string;
        bvnVerified: boolean;
    }>;
    getMyGroups(userId: string, opts?: {
        page?: number;
        limit?: number;
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        status?: GroupStatus;
        frequency?: Frequency;
        isAdmin?: boolean;
    }): Promise<{
        items: any[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    verifyTransactionPin(userId: string, pin: string): Promise<boolean>;
    changeTransactionPin(userId: string, currentPin: string, newPin: string): Promise<{
        ok: boolean;
    }>;
    resetTransactionPin(userId: string, password: string, newPin: string): Promise<{
        ok: boolean;
    }>;
    getReferralStats(userId: string): Promise<{
        referralCode: string;
        totalReferrals: number;
        onboardedReferrals: number;
    }>;
}
