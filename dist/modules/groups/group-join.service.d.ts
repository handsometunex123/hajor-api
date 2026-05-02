import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JoinRequestStatus } from '@prisma/client';
export declare class GroupJoinService {
    private readonly prisma;
    private readonly notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    listJoinRequests(actorId: string, groupId: string, status?: string): Promise<({
        user: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
        };
    } & import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        userId: string;
        status: JoinRequestStatus;
        acceptedTerms: boolean;
        adminAcceptedIndemnity: boolean;
        createdAt: Date;
    }, unknown> & {})[]>;
    requestToJoin(userId: string, groupId: string, acceptTerms: boolean): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        userId: string;
        status: JoinRequestStatus;
        acceptedTerms: boolean;
        adminAcceptedIndemnity: boolean;
        createdAt: Date;
    }, unknown> & {}>;
    approveJoinRequest(adminId: string, requestId: string, acceptIndemnity: boolean): Promise<{
        contributor: any;
    }>;
    rejectJoinRequest(adminId: string, requestId: string): Promise<{
        success: boolean;
    }>;
}
