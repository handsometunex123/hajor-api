import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure based on your FRONTEND_URL in production
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract JWT token from handshake auth or query
      const token = client.handshake.auth?.token || client.handshake.query?.token;

      if (!token) {
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token as string);
      client.userId = payload.id;

      console.log(`Client connected: ${client.id}, User: ${client.userId}`);
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      if (!client.userId) {
        return { error: 'Unauthorized' };
      }

      // Verify user has access to this conversation
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: data.conversationId },
        include: { group: true },
      });

      if (!conversation) {
        return { error: 'Conversation not found' };
      }

      // Check if user is participant or group admin
      const isParticipant = conversation.userId === client.userId;
      const isAdmin = conversation.group.adminId === client.userId;

      if (!isParticipant && !isAdmin) {
        return { error: 'Access denied' };
      }

      // Join the conversation room
      client.join(`conversation:${data.conversationId}`);
      console.log(`User ${client.userId} joined conversation ${data.conversationId}`);

      return { success: true, conversationId: data.conversationId };
    } catch (error) {
      console.error('Error joining conversation:', error);
      return { error: 'Failed to join conversation' };
    }
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
    console.log(`User ${client.userId} left conversation ${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    // Broadcast typing indicator to others in the conversation
    client.to(`conversation:${data.conversationId}`).emit('user_typing', {
      userId: client.userId,
      conversationId: data.conversationId,
      isTyping: data.isTyping,
    });
  }

  // Helper method to emit new message to conversation participants
  emitNewMessage(conversationId: string, message: any) {
    this.server.to(`conversation:${conversationId}`).emit('new_message', message);
  }

  // Helper method to emit message read status update
  emitMessagesRead(conversationId: string, data: { userId: string; readAt: Date }) {
    this.server.to(`conversation:${conversationId}`).emit('messages_read', data);
  }
}
