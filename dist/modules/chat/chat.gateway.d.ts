import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
interface AuthenticatedSocket extends Socket {
    userId?: string;
}
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    private readonly prisma;
    server: Server;
    constructor(jwtService: JwtService, prisma: PrismaService);
    handleConnection(client: AuthenticatedSocket): Promise<void>;
    handleDisconnect(client: AuthenticatedSocket): void;
    handleJoinConversation(client: AuthenticatedSocket, data: {
        conversationId: string;
    }): Promise<{
        error: string;
        success?: undefined;
        conversationId?: undefined;
    } | {
        success: boolean;
        conversationId: string;
        error?: undefined;
    }>;
    handleLeaveConversation(client: AuthenticatedSocket, data: {
        conversationId: string;
    }): Promise<{
        success: boolean;
    }>;
    handleTyping(client: AuthenticatedSocket, data: {
        conversationId: string;
        isTyping: boolean;
    }): Promise<void>;
    emitNewMessage(conversationId: string, message: any): void;
    emitMessagesRead(conversationId: string, data: {
        userId: string;
        readAt: Date;
    }): void;
}
export {};
