import { GroupFeedItemDto } from './group-feed-item.dto';
declare class PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export declare class GroupFeedResponseDto {
    data: GroupFeedItemDto[];
    meta: PaginationMeta;
}
export {};
