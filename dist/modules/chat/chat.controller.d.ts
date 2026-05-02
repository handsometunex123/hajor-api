import { ChatService } from './chat.service';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { SendMessageDto } from './dto/send-message.dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getOrCreateConversation(req: RequestWithUser, groupId: string): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        groupId: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    sendMessage(req: RequestWithUser, conversationId: string, dto: SendMessageDto): Promise<{
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
    getMessages(req: RequestWithUser, conversationId: string, query: ListQueryDto): Promise<{
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
    update(req: RequestWithUser, conversationId: string): Promise<{
        success: boolean;
    }>;
    getGroupConversations(req: RequestWithUser, groupId: string, query: ListQueryDto): Promise<{
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
