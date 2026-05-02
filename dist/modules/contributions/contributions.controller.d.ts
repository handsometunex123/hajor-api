import { ContributionsService } from './contributions.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
export declare class ContributionsController {
    private readonly contributions;
    constructor(contributions: ContributionsService);
    createCycle(dto: CreateCycleDto): Promise<{
        id: string;
    }>;
    getCurrentCycle(id: string): Promise<{
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
    getGroupStatus(id: string): Promise<{
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
    getDefaulters(id: string, query: ListQueryDto): Promise<{
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
    recordPayment(dto: RecordPaymentDto): Promise<{
        paymentId: string;
        transactionId: any;
    }>;
    updateCycleStatus(id: string, body: {
        status: string;
    }): Promise<{
        id: string;
        status: import(".prisma/client").ContributionCycleStatus;
    }>;
    adminMarkPaid(req: RequestWithUser, id: string, body: {
        reason?: string;
    }): Promise<{
        ok: boolean;
        message: string;
    } | {
        ok: boolean;
        message?: undefined;
    }>;
    retryFailed(id: string): Promise<{
        ok: boolean;
        failedCount: number;
    }>;
    waiveLateFee(req: RequestWithUser, id: string, body: {
        reason?: string;
    }): Promise<{
        ok: boolean;
        message: string;
    } | {
        ok: boolean;
        message?: undefined;
    }>;
}
