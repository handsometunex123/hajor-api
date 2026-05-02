import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentQueueService } from '../../infrastructure/queue/payment-queue.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class GroupLifecycleService {
    private readonly prisma;
    private readonly paymentQueue;
    private readonly queue;
    private readonly notifications;
    constructor(prisma: PrismaService, paymentQueue: PaymentQueueService, queue: QueueService, notifications: NotificationsService);
    private addDays;
    private addMonths;
    startGroup(adminId: string, groupId: string, options?: {
        firstContributionDate?: Date;
    }): Promise<{
        success: boolean;
        cycles: any[];
    }>;
    forcePayoutCycle(adminId: string, groupId: string, cycleId: string): Promise<{
        ok: boolean;
        cycleId: string;
    }>;
    rescheduleCycle(adminId: string, groupId: string, cycleId: string, newDate: Date, reason: string): Promise<{
        ok: boolean;
        rescheduledCount: number;
        cycles: (import("@prisma/client/runtime").GetResult<{
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
        }, unknown> & {})[];
    }>;
    requestCycleReschedule(adminId: string, groupId: string, cycleId: string, requestedDate: Date, reason: string): Promise<{
        ok: boolean;
        ticketId: string;
        message: string;
    }>;
    approveCycleReschedule(superAdminId: string, ticketId: string): Promise<{
        ok: boolean;
        rescheduledCount: number;
        cycles: (import("@prisma/client/runtime").GetResult<{
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
        }, unknown> & {})[];
    }>;
    rejectCycleReschedule(superAdminId: string, ticketId: string, notes?: string): Promise<{
        ok: boolean;
        ticketId: string;
    }>;
}
