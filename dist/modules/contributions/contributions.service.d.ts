import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AuditService } from '../../common/audit/audit.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
export declare class ContributionsService {
    private readonly prisma;
    private readonly queue;
    private readonly transactions;
    private readonly audit;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, queue: QueueService, transactions: TransactionsService, audit: AuditService, redis: RedisService);
    createCycle(params: {
        groupId: string;
        cycleNumber: number;
        contributionDate: Date;
        payoutDate: Date;
    }): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        cycleNumber: number;
        contributionDate: Date;
        payoutDate: Date;
        status: import(".prisma/client").ContributionCycleStatus;
        completedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }, unknown> & {}>;
    checkCycleCompletion(cycleId: string): Promise<{
        completed: boolean;
    }>;
    getCurrentCycle(groupId: string): Promise<{
        payments: ({
            groupContributor: {
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
                    role: import(".prisma/client").UserRole;
                    notificationChannel: string;
                    mustChangePassword: boolean;
                    referralCode: string | null;
                    referredById: string | null;
                }, unknown> & {};
            } & import("@prisma/client/runtime").GetResult<{
                id: string;
                groupId: string;
                userId: string;
                displayId: string;
                payoutOrder: number | null;
                isActive: boolean;
                termsAcceptedAt: Date | null;
                termsVersionAccepted: number | null;
                joinedAt: Date;
                joinMethod: import(".prisma/client").JoinMethod;
                deletedAt: Date | null;
            }, unknown> & {};
        } & import("@prisma/client/runtime").GetResult<{
            id: string;
            cycleId: string;
            groupContributorId: string;
            amount: import("@prisma/client/runtime").Decimal;
            status: import(".prisma/client").ContributionPaymentStatus;
            paidAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }, unknown> & {})[];
    } & import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        cycleNumber: number;
        contributionDate: Date;
        payoutDate: Date;
        status: import(".prisma/client").ContributionCycleStatus;
        completedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }, unknown> & {}>;
    getDefaulters(cycleId: string, opts?: {
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        items: {
            paymentId: string;
            contributor: {
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
                    role: import(".prisma/client").UserRole;
                    notificationChannel: string;
                    mustChangePassword: boolean;
                    referralCode: string | null;
                    referredById: string | null;
                }, unknown> & {};
            } & import("@prisma/client/runtime").GetResult<{
                id: string;
                groupId: string;
                userId: string;
                displayId: string;
                payoutOrder: number | null;
                isActive: boolean;
                termsAcceptedAt: Date | null;
                termsVersionAccepted: number | null;
                joinedAt: Date;
                joinMethod: import(".prisma/client").JoinMethod;
                deletedAt: Date | null;
            }, unknown> & {};
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getPendingPaymentsForCycle(cycleId: string): Promise<({
        groupContributor: {
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
                role: import(".prisma/client").UserRole;
                notificationChannel: string;
                mustChangePassword: boolean;
                referralCode: string | null;
                referredById: string | null;
            }, unknown> & {};
        } & import("@prisma/client/runtime").GetResult<{
            id: string;
            groupId: string;
            userId: string;
            displayId: string;
            payoutOrder: number | null;
            isActive: boolean;
            termsAcceptedAt: Date | null;
            termsVersionAccepted: number | null;
            joinedAt: Date;
            joinMethod: import(".prisma/client").JoinMethod;
            deletedAt: Date | null;
        }, unknown> & {};
    } & import("@prisma/client/runtime").GetResult<{
        id: string;
        cycleId: string;
        groupContributorId: string;
        amount: import("@prisma/client/runtime").Decimal;
        status: import(".prisma/client").ContributionPaymentStatus;
        paidAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }, unknown> & {})[]>;
    getGroupContributionStatus(groupId: string): Promise<{
        current: {
            payments: ({
                groupContributor: {
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
                        role: import(".prisma/client").UserRole;
                        notificationChannel: string;
                        mustChangePassword: boolean;
                        referralCode: string | null;
                        referredById: string | null;
                    }, unknown> & {};
                } & import("@prisma/client/runtime").GetResult<{
                    id: string;
                    groupId: string;
                    userId: string;
                    displayId: string;
                    payoutOrder: number | null;
                    isActive: boolean;
                    termsAcceptedAt: Date | null;
                    termsVersionAccepted: number | null;
                    joinedAt: Date;
                    joinMethod: import(".prisma/client").JoinMethod;
                    deletedAt: Date | null;
                }, unknown> & {};
            } & import("@prisma/client/runtime").GetResult<{
                id: string;
                cycleId: string;
                groupContributorId: string;
                amount: import("@prisma/client/runtime").Decimal;
                status: import(".prisma/client").ContributionPaymentStatus;
                paidAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
            }, unknown> & {})[];
        } & import("@prisma/client/runtime").GetResult<{
            id: string;
            groupId: string;
            cycleNumber: number;
            contributionDate: Date;
            payoutDate: Date;
            status: import(".prisma/client").ContributionCycleStatus;
            completedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }, unknown> & {};
        paid: ({
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
                role: import(".prisma/client").UserRole;
                notificationChannel: string;
                mustChangePassword: boolean;
                referralCode: string | null;
                referredById: string | null;
            }, unknown> & {};
        } & import("@prisma/client/runtime").GetResult<{
            id: string;
            groupId: string;
            userId: string;
            displayId: string;
            payoutOrder: number | null;
            isActive: boolean;
            termsAcceptedAt: Date | null;
            termsVersionAccepted: number | null;
            joinedAt: Date;
            joinMethod: import(".prisma/client").JoinMethod;
            deletedAt: Date | null;
        }, unknown> & {})[];
        unpaid: ({
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
                role: import(".prisma/client").UserRole;
                notificationChannel: string;
                mustChangePassword: boolean;
                referralCode: string | null;
                referredById: string | null;
            }, unknown> & {};
        } & import("@prisma/client/runtime").GetResult<{
            id: string;
            groupId: string;
            userId: string;
            displayId: string;
            payoutOrder: number | null;
            isActive: boolean;
            termsAcceptedAt: Date | null;
            termsVersionAccepted: number | null;
            joinedAt: Date;
            joinMethod: import(".prisma/client").JoinMethod;
            deletedAt: Date | null;
        }, unknown> & {})[];
        defaulters: ({
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
                role: import(".prisma/client").UserRole;
                notificationChannel: string;
                mustChangePassword: boolean;
                referralCode: string | null;
                referredById: string | null;
            }, unknown> & {};
        } & import("@prisma/client/runtime").GetResult<{
            id: string;
            groupId: string;
            userId: string;
            displayId: string;
            payoutOrder: number | null;
            isActive: boolean;
            termsAcceptedAt: Date | null;
            termsVersionAccepted: number | null;
            joinedAt: Date;
            joinMethod: import(".prisma/client").JoinMethod;
            deletedAt: Date | null;
        }, unknown> & {})[];
    }>;
    getGroupSummary(groupId: string): Promise<any>;
    recordContributionPayment(params: {
        cycleId: string;
        groupContributorId: string;
        reference: string;
        amount: string | number;
        payerWalletId: string;
    }): Promise<{
        payment: import("@prisma/client/runtime").GetResult<{
            id: string;
            cycleId: string;
            groupContributorId: string;
            amount: import("@prisma/client/runtime").Decimal;
            status: import(".prisma/client").ContributionPaymentStatus;
            paidAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }, unknown> & {};
        transaction: any;
    }>;
    completeCycle(cycleId: string): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        cycleNumber: number;
        contributionDate: Date;
        payoutDate: Date;
        status: import(".prisma/client").ContributionCycleStatus;
        completedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }, unknown> & {}>;
    adminMarkPaymentPaid(paymentId: string, adminId: string, reason?: string): Promise<{
        ok: boolean;
        message: string;
    } | {
        ok: boolean;
        message?: undefined;
    }>;
    enqueueRetryFailed(cycleId: string): Promise<{
        ok: boolean;
        failedCount: number;
    }>;
    waiveLateFee(paymentId: string, adminId: string, reason?: string): Promise<{
        ok: boolean;
        message: string;
    } | {
        ok: boolean;
        message?: undefined;
    }>;
}
