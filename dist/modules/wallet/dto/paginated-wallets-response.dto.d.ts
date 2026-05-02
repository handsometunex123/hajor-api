import { NonProvisionedWalletItemDto } from './non-provisioned-wallet-item.dto';
declare class PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export declare class PaginatedWalletsResponseDto {
    items: NonProvisionedWalletItemDto[];
    pagination: PaginationMeta;
}
export {};
