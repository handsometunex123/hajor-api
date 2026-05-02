import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
export declare class ChatService {
    private readonly prisma;
    private readonly chatGateway;
    constructor(prisma: PrismaService, chatGateway: ChatGateway);
    getOrCreateConversation(groupId: string, userId: string): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    sendMessage(senderId: string, conversationId: string, content: string): Promise<{
        sender: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & import("@prisma/client/runtime").GetResult<{
        id: string;
        conversationId: string;
        senderId: string;
        type: import(".prisma/client").MessageType;
        content: string;
        isRead: boolean;
        createdAt: Date;
    }, unknown> & {}>;
    getConversationMessages(userId: string, conversationId: string, opts?: {
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        data: ({
            sender: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & import("@prisma/client/runtime").GetResult<{
            id: string;
            conversationId: string;
            senderId: string;
            type: import(".prisma/client").MessageType;
            content: string;
            isRead: boolean;
            createdAt: Date;
        }, unknown> & {})[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    markMessagesAsRead(userId: string, conversationId: string): Promise<{
        success: boolean;
    }>;
    getAdminConversations(adminId: string, groupId: string, opts?: {
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        data: {
            id: string;
            groupId: string;
            userId: string;
            user: {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
            };
            lastMessage: {
                id: string;
                content: string;
                createdAt: Date;
                isRead: boolean;
            };
            unreadCount: number;
            createdAt: Date;
            updatedAt: Date;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
}
