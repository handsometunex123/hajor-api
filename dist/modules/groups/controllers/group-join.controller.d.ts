import { GroupJoinService } from '../group-join.service';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { JoinRequestStatus } from '@prisma/client';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';
export declare class GroupJoinController {
    private readonly svc;
    constructor(svc: GroupJoinService);
    list(req: RequestWithUser, groupId: string, query: ListQueryDto & {
        status?: string;
    }): Promise<{
        items: ({
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
        }, unknown> & {})[];
    }>;
    request(req: RequestWithUser, groupId: string, body: {
        acceptTerms: boolean;
    }): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        userId: string;
        status: JoinRequestStatus;
        acceptedTerms: boolean;
        adminAcceptedIndemnity: boolean;
        createdAt: Date;
    }, unknown> & {}>;
    updateStatus(req: RequestWithUser, groupId: string, requestId: string, body: {
        status: string;
        acceptIndemnity?: boolean;
    }): Promise<{
        contributor: any;
    } | {
        success: boolean;
    }>;
}
