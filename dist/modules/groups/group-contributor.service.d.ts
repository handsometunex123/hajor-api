import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class GroupContributorService {
    private readonly prisma;
    private readonly notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    addSelfSlot(userId: string, groupId: string): Promise<any>;
    removeContributor(adminId: string, groupId: string, contributorId: string): Promise<{
        success: boolean;
    }>;
    listContributors(groupId: string, opts?: {
        page?: number;
        limit?: number;
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        isActive?: boolean;
    }): Promise<{
        groupId: string;
        slots: number;
        items: {
            id: string;
            displayId: string;
            userId: string;
            payoutOrder: number;
            isActive: boolean;
            termsAcceptedAt: Date;
            joinedAt: Date;
            user: {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
                phone: string;
            };
            joinMethod: import(".prisma/client").JoinMethod;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    swapPayoutOrder(adminId: string, groupId: string, aId: string, bId: string): Promise<{
        success: boolean;
    }>;
    acceptTerms(userId: string, groupId: string, contributorId: string): Promise<{
        success: boolean;
        termsAcceptedAt: Date;
    }>;
    nudgeTerms(adminId: string, groupId: string): Promise<{
        sent: number;
        message: string;
        total?: undefined;
    } | {
        sent: number;
        total: number;
        message?: undefined;
    }>;
}
