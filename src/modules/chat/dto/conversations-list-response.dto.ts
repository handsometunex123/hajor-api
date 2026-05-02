import { ApiProperty } from '@nestjs/swagger';

class ConversationUser {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;
}

class LastMessage {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  isRead: boolean;
}

class ConversationWithDetails {
  @ApiProperty()
  id: string;

  @ApiProperty()
  groupId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ type: ConversationUser })
  user: ConversationUser;

  @ApiProperty({ type: LastMessage, required: false })
  lastMessage?: LastMessage;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

class Pagination {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  pages: number;
}

export class ConversationsListResponseDto {
  @ApiProperty({ type: [ConversationWithDetails] })
  data: ConversationWithDetails[];

  @ApiProperty({ type: Pagination })
  pagination: Pagination;
}
