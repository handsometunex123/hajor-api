import { TransactionItemDto } from './transaction-item.dto';
declare class PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export declare class PaginatedTransactionsResponseDto {
    items: TransactionItemDto[];
    pagination: PaginationMeta;
}
export {};
