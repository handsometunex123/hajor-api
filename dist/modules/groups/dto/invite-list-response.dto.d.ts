import { InviteItemDto } from './invite-item.dto';
declare class PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export declare class InviteListResponseDto {
    items: InviteItemDto[];
    pagination: PaginationMeta;
}
export {};
