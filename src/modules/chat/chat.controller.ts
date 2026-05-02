import { Controller, Post, Get, Body, Param, UseGuards, Req, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ChatService } from './chat.service';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { SendMessageDto } from './dto/send-message.dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { OkResponseDto } from '../../common/dto/ok-response.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { MessagesListResponseDto } from './dto/messages-list-response.dto';
import { ConversationsListResponseDto } from './dto/conversations-list-response.dto';

@ApiTags('Chat')
@Controller('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('groups/:groupId/conversations')
  @ApiOperation({ summary: 'Get or create conversation between user and group admin' })
  @ApiResponse({ status: 200, description: 'Conversation created/retrieved', type: ConversationResponseDto })
  async getOrCreateConversation(@Req() req: RequestWithUser, @Param('groupId') groupId: string) {
    const userId = req.user?.id;
    return this.chatService.getOrCreateConversation(groupId, userId);
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({ status: 200, description: 'Message sent', type: MessageResponseDto })
  async sendMessage(
    @Req() req: RequestWithUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    const senderId = req.user?.id;
    return this.chatService.sendMessage(senderId, conversationId, dto.content);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation messages', type: MessagesListResponseDto })
  async getMessages(
    @Req() req: RequestWithUser,
    @Param('conversationId') conversationId: string,
    @Query() query: ListQueryDto,
  ) {
    const userId = req.user?.id;
    return this.chatService.getConversationMessages(userId, conversationId, { page: query.page, limit: query.limit, sortBy: query.sortBy, sortOrder: query.sortOrder as 'asc' | 'desc' });
  }

  @Patch('conversations/:conversationId')
  @ApiOperation({ summary: 'Update conversation (mark messages as read)' })
  @ApiBody({ schema: { properties: { lastReadAt: { type: 'string', format: 'date-time' } } } })
  @ApiResponse({ status: 200, description: 'Conversation updated', type: OkResponseDto })
  async update(@Req() req: RequestWithUser, @Param('conversationId') conversationId: string) {
    const userId = req.user?.id;
    return this.chatService.markMessagesAsRead(userId, conversationId);
  }

  @Get('groups/:groupId/conversations')
  @ApiOperation({ summary: 'Get all conversations for a group (admin only)' })
  @ApiResponse({ status: 200, description: 'Group conversations', type: ConversationsListResponseDto })
  async getGroupConversations(
    @Req() req: RequestWithUser,
    @Param('groupId') groupId: string,
    @Query() query: ListQueryDto,
  ) {
    const adminId = req.user?.id;
    return this.chatService.getAdminConversations(adminId, groupId, { page: query.page, limit: query.limit, sortBy: query.sortBy, sortOrder: query.sortOrder as 'asc' | 'desc' });
  }
}
