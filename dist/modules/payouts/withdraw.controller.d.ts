import { Request } from 'express';
import { CreateWithdrawDto } from './withdraw.dto';
import { WithdrawService } from './withdraw.service';
export declare class WithdrawController {
    private readonly service;
    constructor(service: WithdrawService);
    create(req: Request, dto: CreateWithdrawDto): Promise<{
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
    confirm(req: Request, txId: string, body: {
        otp?: string;
    }): Promise<{
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
