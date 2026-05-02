import { UsersService } from './users.service';
import { OnboardInviteDto } from './dto/onboard-invite.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { VerifyBvnDto } from './dto/verify-bvn.dto';
import { ChangeTransactionPinDto } from './dto/change-transaction-pin.dto';
import { ResetTransactionPinDto } from './dto/reset-transaction-pin.dto';
import { MyGroupsQueryDto } from './dto/my-groups-query.dto';
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    getMe(req: RequestWithUser): Promise<any>;
    myGroups(user: {
        id: string;
    }, query: MyGroupsQueryDto): Promise<{
        items: any[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    myReferrals(user: {
        id: string;
    }): Promise<{
        referralCode: string;
        totalReferrals: number;
        onboardedReferrals: number;
    }>;
    list(req: RequestWithUser, query: ListUsersDto): Promise<{
        items: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
            bvnVerified: boolean;
            role: import(".prisma/client").UserRole;
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
    verifyBvn(req: RequestWithUser, body: VerifyBvnDto): Promise<{
        userId: string;
        bvnVerified: boolean;
    }>;
    onboardInvite(userId: string, body: OnboardInviteDto): Promise<{
        success: boolean;
        user: any;
    }>;
    upgradeProxy(req: RequestWithUser, userId: string): Promise<{
        ok: boolean;
        userId: string;
        role: import(".prisma/client").UserRole;
    }>;
    changeTransactionPin(user: {
        id: string;
    }, body: ChangeTransactionPinDto): Promise<{
        ok: boolean;
    }>;
    resetTransactionPin(user: {
        id: string;
    }, body: ResetTransactionPinDto): Promise<{
        ok: boolean;
    }>;
}
