import { WalletService } from './wallet.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
export declare class WalletController {
    private readonly walletService;
    constructor(walletService: WalletService);
    getBalance(user: {
        id: string;
    }): Promise<{
        balance: string;
    }>;
    listTransactions(user: {
        id: string;
    }, q: ListQueryDto, type?: string, status?: string): Promise<{
        items: {
            id: string;
            type: import(".prisma/client").TransactionType;
            amount: string;
            reference: string;
            status: import(".prisma/client").TransactionStatus;
            metadata: import(".prisma/client").Prisma.JsonValue;
            createdAt: Date;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    listNonProvisioned(query: ListQueryDto): Promise<{
        items: {
            id: string;
            userId: string;
            provisionStatus: string;
            attempts: any;
            provisionedAt: any;
            user: {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
            };
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    adminTriggerProvision(walletId: string): Promise<{
        ok: boolean;
        walletId: string;
    }>;
    devProvisionAll(): Promise<{
        provisioned: number;
        walletIds: string[];
    }>;
    devFundWallet(userId: string, amount: number): Promise<{
        walletId: string;
        credited: number;
        newBalance: string;
    }>;
}
