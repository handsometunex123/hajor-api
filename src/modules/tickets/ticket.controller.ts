import { Controller, Post, Get, Patch, UseGuards, Req, Param, Body, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { TicketDetailResponseDto } from './dto/ticket-detail-response.dto';
import { PaginatedUserTicketsResponseDto } from './dto/paginated-user-tickets-response.dto';
import { PaginatedGroupTicketsResponseDto } from './dto/paginated-group-tickets-response.dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('Tickets')
@Controller('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post()
  @ApiOperation({ summary: 'Create a ticket (contributor replacement or leave group)' })
  @ApiBody({ type: CreateTicketDto })
  @ApiResponse({ status: 201, description: 'Ticket created', type: TicketResponseDto })
  async create(@Req() req: RequestWithUser, @Body() dto: CreateTicketDto) {
    const userId = req.user?.id;
    return this.ticketService.createTicket(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket details' })
  @ApiResponse({ status: 200, description: 'Ticket details', type: TicketDetailResponseDto })
  async getTicket(@Param('id') id: string) {
    return this.ticketService.getTicket(id);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get my tickets' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED'] })
  @ApiQuery({ name: 'type', required: false, enum: ['CONTRIBUTOR_REPLACEMENT', 'LEAVE_GROUP', 'DISPUTE', 'CYCLE_RESCHEDULE', 'OTHER'] })
  @ApiResponse({ status: 200, description: 'User tickets', type: PaginatedUserTicketsResponseDto })
  async getMyTickets(@Req() req: RequestWithUser, @Query() query: ListQueryDto, @Query('status') status?: string, @Query('type') type?: string) {
    const userId = req.user?.id;
    return this.ticketService.getUserTickets(userId, { page: query.page, limit: query.limit, status, type, sortBy: query.sortBy, sortOrder: query.sortOrder as 'asc' | 'desc' });
  }

  @Get('groups/:groupId')
  @ApiOperation({ summary: 'Get all tickets for a group (admin only)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED'] })
  @ApiQuery({ name: 'type', required: false, enum: ['CONTRIBUTOR_REPLACEMENT', 'LEAVE_GROUP', 'DISPUTE', 'CYCLE_RESCHEDULE', 'OTHER'] })
  @ApiResponse({ status: 200, description: 'Group tickets', type: PaginatedGroupTicketsResponseDto })
  async getGroupTickets(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Query() query: ListQueryDto, @Query('status') status?: string, @Query('type') type?: string) {
    const adminId = req.user?.id;
    return this.ticketService.getGroupTickets(groupId, adminId, { page: query.page, limit: query.limit, status, type, sortBy: query.sortBy, sortOrder: query.sortOrder as 'asc' | 'desc' });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update ticket status (admin only)' })
  @ApiBody({ type: UpdateTicketStatusDto })
  @ApiResponse({ status: 200, description: 'Ticket updated', type: TicketResponseDto })
  async updateStatus(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    const adminId = req.user?.id;
    return this.ticketService.updateTicketStatus(id, adminId, dto);
  }
}
