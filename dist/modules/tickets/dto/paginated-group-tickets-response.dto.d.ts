import { GroupTicketResponseDto } from './group-ticket-response.dto';
declare class Pagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export declare class PaginatedGroupTicketsResponseDto {
    items: GroupTicketResponseDto[];
    pagination: Pagination;
}
export {};
