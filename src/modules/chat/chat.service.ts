import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async getOrCreateConversation(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');

    let conversation = await this.prisma.conversation.findUnique({ where: { groupId_userId: { groupId, userId } } });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({ data: { groupId, userId } });
    }
    return conversation;
  }

  async sendMessage(senderId: string, conversationId: string, content: string) {
    const conversation = await this.prisma.conversation.findUnique({ 
      where: { id: conversationId }, 
      include: { group: true, user: true } 
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Verify sender is either admin or the user in conversation
    const isAdmin = conversation.group.adminId === senderId;
    const isParticipant = conversation.userId === senderId;
    if (!isAdmin && !isParticipant) {
      throw new ForbiddenException('You are not authorized to send messages in this conversation');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        type: 'TEXT',
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    // Emit real-time message to WebSocket clients
    this.chatGateway.emitNewMessage(conversationId, message);

    return message;
  }

  async getConversationMessages(userId: string, conversationId: string, opts: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const conversation = await this.prisma.conversation.findUnique({ 
      where: { id: conversationId }, 
      include: { group: true } 
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Verify user is either admin or the participant
    const isAdmin = conversation.group.adminId === userId;
    const isParticipant = conversation.userId === userId;
    if (!isAdmin && !isParticipant) {
      throw new ForbiddenException('You are not authorized to view this conversation');
    }

    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const allowedSortFields = ['createdAt'];
    const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      data: messages,
      pagination: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async markMessagesAsRead(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({ 
      where: { id: conversationId }, 
      include: { group: true } 
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Verify user is participant
    const isAdmin = conversation.group.adminId === userId;
    const isParticipant = conversation.userId === userId;
    if (!isAdmin && !isParticipant) {
      throw new ForbiddenException('You are not authorized');
    }

    // Mark messages sent by the other person as read
    const readAt = new Date();
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    // Emit real-time read status update
    this.chatGateway.emitMessagesRead(conversationId, { userId, readAt });

    return { success: true };
  }

  async getAdminConversations(adminId: string, groupId: string, opts: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.adminId !== adminId) throw new ForbiddenException('Only admin can view group conversations');

    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const allowedSortFields = ['createdAt', 'updatedAt'];
    const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'updatedAt';
    const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { groupId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, content: true, createdAt: true, isRead: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({ where: { groupId } }),
    ]);

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (c) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: c.id,
            senderId: { not: adminId },
            isRead: false,
          },
        });

        return {
          id: c.id,
          groupId: c.groupId,
          userId: c.userId,
          user: c.user,
          lastMessage: c.messages[0] || undefined,
          unreadCount,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      })
    );

    return {
      data: conversationsWithUnread,
      pagination: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
