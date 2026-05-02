import { UserRole } from '@prisma/client';
export declare class UserLiteDto {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dob?: string;
    address?: string;
    trustScore?: number;
    bvnVerified?: boolean;
    createdAt?: string;
    referralCode?: string;
    notificationChannel?: string;
    role?: UserRole;
    kycTier?: number;
    bvnVerifiedAt?: string;
    bvnVerificationRef?: string;
    emailVerifiedAt?: string;
    lastActiveAt?: string;
}
