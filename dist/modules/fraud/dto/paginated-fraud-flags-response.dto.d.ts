import { FraudFlagResponseDto } from './fraud-flag-response.dto';
declare class Pagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export declare class PaginatedFraudFlagsResponseDto {
    items: FraudFlagResponseDto[];
    pagination: Pagination;
}
export {};
