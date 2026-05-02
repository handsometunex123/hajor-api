import { Body, Controller, Post, UseGuards, BadRequestException, Get, Req, Patch, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { wrapResponse, wrapArrayResponse } from '../../common/dto/wrap-response';
import { NotificationsService } from './notifications.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { JsonObject } from '../../common/types/json';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class NotifyDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  payload?: JsonObject;
}

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create and send a notification (admin/debug)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBody({ type: NotifyDto })
  @ApiResponse({ status: 200, description: 'Notification created', type: wrapResponse(NotificationResponseDto) })
  async notify(@Body() dto: NotifyDto) {
    try {
      const res = await this.notifications.sendNotification(dto as any);
      return { id: res.id };
    } catch (err) {
      throw new BadRequestException(err?.message || 'Failed to create notification');
    }
  }

  @Get()
  @ApiOperation({ summary: 'List notifications for authenticated user' })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean, description: 'Filter by read status' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter by notification type' })
  @ApiResponse({ status: 200, description: 'List of notifications', type: wrapArrayResponse(NotificationResponseDto) })
  async list(@Req() req: RequestWithUser, @Query() query: ListQueryDto, @Query('isRead') isRead?: string, @Query('type') type?: string) {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?.sub;
      if (!userId) throw new BadRequestException('Missing authenticated user');
      const opts: any = { page: query.page, limit: query.limit, sortBy: query.sortBy, sortOrder: query.sortOrder };
      if (isRead === 'true') opts.isRead = true;
      else if (isRead === 'false') opts.isRead = false;
      if (type) opts.type = type;
      return await this.notifications.listByUser(userId as string, opts);
    } catch (err) {
      throw new BadRequestException(err?.message || 'Failed to list notifications');
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a notification (mark as read)' })
  @ApiBody({ schema: { properties: { isRead: { type: 'boolean' } } } })
  @ApiResponse({ status: 200, description: 'Notification updated', type: wrapResponse(NotificationResponseDto) })
  async update(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?.sub;
      if (!userId) throw new BadRequestException('Missing authenticated user');
      const updated = await this.notifications.markRead(id, userId as string);
      return { id: updated.id, isRead: updated.isRead };
    } catch (err) {
      throw new BadRequestException(err?.message || 'Failed to mark notification read');
    }
  }
}
