import { UserLiteDto } from './user-lite.dto';
declare class PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export declare class PaginatedUsersResponseDto {
    items: UserLiteDto[];
    pagination: PaginationMeta;
}
export {};
