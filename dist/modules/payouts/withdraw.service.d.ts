import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { PaystackService } from '../../infrastructure/paystack/paystack.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { UsersService } from '../users/users.service';
export declare class WithdrawService {
    private readonly prisma;
    private readonly transactions;
    private readonly paystack;
    private readonly queue;
    private readonly usersService;
    private readonly logger;
    private readonly OTP_THRESHOLD;
    private readonly MAX_SINGLE;
    private readonly DAILY_LIMIT;
    constructor(prisma: PrismaService, transactions: TransactionsService, paystack: PaystackService, queue: QueueService, usersService: UsersService);
    requestWithdraw(userId: string, amount: number, recipient: string, transactionPin: string, note?: string): Promise<{
        txId: any;
        status: string;
        needsOtp: boolean;
        provider_reference?: undefined;
        error?: undefined;
    } | {
        txId: any;
        provider_reference: any;
        status: string;
        needsOtp?: undefined;
        error?: undefined;
    } | {
        txId: any;
        status: string;
        error: string;
        needsOtp?: undefined;
        provider_reference?: undefined;
    }>;
    confirmWithdraw(userId: string, txId: string, otp?: string): Promise<{
        txId: string;
        provider_reference: any;
        status: string;
        error?: undefined;
    } | {
        txId: string;
        status: string;
        error: string;
        provider_reference?: undefined;
    }>;
}
