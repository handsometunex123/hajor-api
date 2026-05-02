export declare class NonProvisionedWalletItemDto {
    id: string;
    userId?: string | null;
    provisionStatus?: string | null;
    attempts?: number;
    provisionedAt?: string | null;
    user?: Record<string, unknown> | null;
}
