import { JsonObject } from '../../common/types/json';
export declare class ProviderChargeDto {
    provider: string;
    providerId: string;
    walletOwnerId: string;
    reference: string;
    amount: number;
    metadata?: JsonObject;
}
export declare class ProviderPayoutDto {
    provider: string;
    providerId: string;
    reference: string;
    amount: number;
    metadata?: JsonObject;
}
