import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { GroupInviteService } from '../group-invite.service';
import { UsersService } from '../../users/users.service';
import { OnboardInviteDto } from '../../users/dto/onboard-invite.dto';
import { CreateInviteDto } from '../dto/create-invite.dto';
import { CreateContactInviteDto } from '../dto/create-contact-invite.dto';
import { ProxyRegisterInitDto } from '../dto/proxy-register-init.dto';
import { ProxyRegisterConfirmDto } from '../dto/proxy-register-confirm.dto';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { InviteListQueryDto } from '../dto/invite-list-query.dto';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';
export declare class GroupInviteController {
    private readonly svc;
    private readonly config;
    constructor(svc: GroupInviteService, config: ConfigService);
    invite(req: RequestWithUser, groupId: string, body: CreateInviteDto): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        userId: string | null;
        invitedById: string;
        metadata: import(".prisma/client").Prisma.JsonValue | null;
        status: import(".prisma/client").JoinRequestStatus;
        expiresAt: Date | null;
        createdAt: Date;
    }, unknown> & {}>;
    inviteContact(req: RequestWithUser, groupId: string, body: CreateContactInviteDto): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        userId: string | null;
        invitedById: string;
        metadata: import(".prisma/client").Prisma.JsonValue | null;
        status: import(".prisma/client").JoinRequestStatus;
        expiresAt: Date | null;
        createdAt: Date;
    }, unknown> & {}>;
    list(req: RequestWithUser, groupId: string, query: ListQueryDto): Promise<{
        items: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
                phone: string;
            };
            invitedBy: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & import("@prisma/client/runtime").GetResult<{
            id: string;
            groupId: string;
            userId: string | null;
            invitedById: string;
            metadata: import(".prisma/client").Prisma.JsonValue | null;
            status: import(".prisma/client").JoinRequestStatus;
            expiresAt: Date | null;
            createdAt: Date;
        }, unknown> & {})[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    proxyRegisterInit(req: RequestWithUser, groupId: string, body: ProxyRegisterInitDto): Promise<{
        message: string;
        phone: string;
        expiresInSeconds: number;
    }>;
    proxyRegisterConfirm(req: RequestWithUser, groupId: string, body: ProxyRegisterConfirmDto): Promise<{
        message: string;
        userId: string;
        contributorId: any;
        loginEmail: any;
    }>;
}
export declare class GroupJoinLinkController {
    private readonly svc;
    private readonly config;
    constructor(svc: GroupInviteService, config: ConfigService);
    private buildUrl;
    upsert(req: RequestWithUser, groupId: string): Promise<{
        url: string;
        token: string;
    }>;
    get(req: RequestWithUser, groupId: string): Promise<{
        url: string;
        token: string;
    }>;
    qrcode(req: RequestWithUser, groupId: string, res: Response): Promise<void>;
    updateStatus(req: RequestWithUser, groupId: string, body: {
        status: string;
    }): Promise<{
        success: boolean;
    }>;
    revoke(req: RequestWithUser, groupId: string): Promise<{
        success: boolean;
    }>;
}
export declare class InviteActionController {
    private readonly svc;
    constructor(svc: GroupInviteService);
    listMine(req: RequestWithUser, query: InviteListQueryDto): Promise<{
        items: ({
            group: {
                id: string;
                name: string;
                contributionAmount: import("@prisma/client/runtime").Decimal;
                frequency: import(".prisma/client").GroupFrequency;
                status: import(".prisma/client").GroupStatus;
            };
            invitedBy: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & import("@prisma/client/runtime").GetResult<{
            id: string;
            groupId: string;
            userId: string | null;
            invitedById: string;
            metadata: import(".prisma/client").Prisma.JsonValue | null;
            status: import(".prisma/client").JoinRequestStatus;
            expiresAt: Date | null;
            createdAt: Date;
        }, unknown> & {})[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    updateStatus(req: RequestWithUser, id: string, body: {
        status: string;
    }): Promise<{
        contributor: any;
    } | {
        success: boolean;
    }>;
}
export declare class JoinLinkController {
    private readonly svc;
    constructor(svc: GroupInviteService);
    consume(req: RequestWithUser, token: string): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        userId: string | null;
        invitedById: string;
        metadata: import(".prisma/client").Prisma.JsonValue | null;
        status: import(".prisma/client").JoinRequestStatus;
        expiresAt: Date | null;
        createdAt: Date;
    }, unknown> & {}>;
}
export declare class PublicInviteController {
    private readonly inviteSvc;
    private readonly usersSvc;
    constructor(inviteSvc: GroupInviteService, usersSvc: UsersService);
    onboard(inviteId: string, body: OnboardInviteDto): Promise<{
        success: boolean;
        user: any;
    }>;
}
