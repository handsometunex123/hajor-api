import { MessageResponseDto } from './message-response.dto';
declare class Pagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export declare class MessagesListResponseDto {
    data: MessageResponseDto[];
    pagination: Pagination;
}
export {};
