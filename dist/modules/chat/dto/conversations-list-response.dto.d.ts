declare class ConversationUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}
declare class LastMessage {
    id: string;
    content: string;
    createdAt: Date;
    isRead: boolean;
}
declare class ConversationWithDetails {
    id: string;
    groupId: string;
    userId: string;
    user: ConversationUser;
    lastMessage?: LastMessage;
    unreadCount: number;
    createdAt: Date;
    updatedAt: Date;
}
declare class Pagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export declare class ConversationsListResponseDto {
    data: ConversationWithDetails[];
    pagination: Pagination;
}
export {};
