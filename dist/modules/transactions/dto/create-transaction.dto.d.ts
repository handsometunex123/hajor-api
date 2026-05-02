import { JsonObject } from '../../../common/types/json';
export declare class CreateTransactionDto {
    walletId: string;
    type: 'CREDIT' | 'DEBIT';
    amount: string;
    reference: string;
    metadata?: JsonObject;
}
