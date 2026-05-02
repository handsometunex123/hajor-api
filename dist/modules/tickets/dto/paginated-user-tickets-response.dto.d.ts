import { UserTicketResponseDto } from './user-ticket-response.dto';
declare class Pagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export declare class PaginatedUserTicketsResponseDto {
    items: UserTicketResponseDto[];
    pagination: Pagination;
}
export {};
