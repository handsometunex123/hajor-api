import { Body, Controller, Get, Param, Post, Patch, BadRequestException, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { wrapResponse, wrapArrayResponse } from '../../common/dto/wrap-response';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { DisputeResponseDto } from './dto/dispute-response.dto';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('Disputes')
@Controller('disputes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a dispute' })
  @ApiBody({ type: CreateDisputeDto })
  @ApiResponse({ status: 200, description: 'Dispute created', type: wrapResponse(DisputeResponseDto) })
  async create(@Body() dto: CreateDisputeDto) {
    try {
      const d = await this.disputes.createDispute(dto);
      return { id: d.id, status: d.status };
    } catch (err) {
      throw new BadRequestException(err?.message || 'Failed to create dispute');
    }
  }

  @Get()
  @ApiOperation({ summary: 'List disputes (filter by userId query param)' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter disputes by user ID' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status (OPEN, RESOLVED, etc.)' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter by dispute type' })
  @ApiResponse({ status: 200, description: 'List of disputes', type: wrapArrayResponse(DisputeResponseDto) })
  async list(@Query('userId') userId: string, @Query('status') status: string, @Query('type') type: string, @Query() query: ListQueryDto) {
    try {
      return await this.disputes.listByUser(userId, { page: query.page, limit: query.limit, status, type, sortBy: query.sortBy, sortOrder: query.sortOrder as 'asc' | 'desc' });
    } catch (err) {
      throw new BadRequestException(err?.message || 'Failed to list disputes');
    }
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Resolve or update a dispute (SUPER_ADMIN only)', description: 'Transition dispute to INVESTIGATING, RESOLVED, or REJECTED.' })
  @ApiBody({ type: ResolveDisputeDto })
  @ApiResponse({ status: 200, description: 'Dispute updated', type: wrapResponse(DisputeResponseDto) })
  async resolve(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.disputes.resolveDispute(id, req.user?.id, dto);
  }
}
