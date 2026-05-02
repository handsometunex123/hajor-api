import { PaymentItemDto } from './payment-item.dto';
declare class PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export declare class DefaulterListResponseDto {
    items: PaymentItemDto[];
    meta: PaginationMeta;
}
export {};
