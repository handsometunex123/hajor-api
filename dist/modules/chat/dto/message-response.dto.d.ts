declare class MessageSender {
    id: string;
    firstName: string;
    lastName: string;
}
export declare class MessageResponseDto {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: string;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
    sender: MessageSender;
}
export {};
