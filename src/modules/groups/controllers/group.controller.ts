import { PLATFORM_INDEMNITY_TEXT, PLATFORM_TERMS_TEXT } from '../../../common/platform-legal';
import { Frequency } from '../../../common/enums';
import { Controller, Post, Body, UseGuards, Req, Get, Param, Query, Patch, BadRequestException, Delete } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GroupService } from '../group.service';
import { GroupLifecycleService } from '../group-lifecycle.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { GroupCreatedResponseDto } from '../dto/group-created-response.dto';
import { GroupDetailsResponseDto } from '../dto/group-details-response.dto';
import { MyGroupStatusResponseDto } from '../dto/my-group-status-response.dto';
import { OkResponseDto } from '../../../common/dto/ok-response.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { wrapResponse, wrapArrayResponse } from '../../../common/dto/wrap-response';
import { GroupFeedResponseDto } from '../dto/group-feed-response.dto';
import { GroupSearchQueryDto } from '../dto/group-search-query.dto';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';

@ApiTags('Groups')
@Controller('groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class GroupController {
  constructor(private readonly groupService: GroupService, private readonly lifecycle: GroupLifecycleService, private readonly config: ConfigService) {}


  @Get('platform-indemnity')
  @ApiOperation({ summary: 'Get platform-wide indemnity text for group admins' })
  @ApiResponse({ status: 200, description: 'Platform indemnity text', schema: { type: 'object', properties: { indemnity: { type: 'string' } } } })
  getPlatformIndemnity() {
    return { indemnity: PLATFORM_INDEMNITY_TEXT };
  }

  @Get('platform-terms')
  @ApiOperation({ summary: 'Get platform-wide group terms for contributors' })
  @ApiResponse({ status: 200, description: 'Platform group terms', schema: { type: 'object', properties: { terms: { type: 'string' } } } })
  getPlatformTerms() {
    return { terms: PLATFORM_TERMS_TEXT };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiBody({ type: CreateGroupDto })
  @ApiResponse({ status: 200, description: 'Group created', type: wrapResponse(GroupCreatedResponseDto) })
  async create(@Req() req: RequestWithUser, @Body() dto: CreateGroupDto) {
    const actorId = req.user?.id;
    await this.groupService.assertKycVerified(actorId);
    await this.groupService.assertWalletProvisioned(actorId);
    const ipAddress = (req as any).ip || 'unknown';
    // Convert frequency string to enum if needed
    const groupDto = {
      name: dto.name,
      description: dto.description,
      maxSlots: dto.maxSlots,
      contributionAmount: dto.contributionAmount,
      frequency: (dto.frequency as any) in Frequency ? (dto.frequency as Frequency) : dto.frequency,
      serviceCharge: dto.serviceCharge,
      lateFee: dto.lateFee,
      gracePeriodDays: dto.gracePeriodDays,
      adminIndemnityAccepted: dto.adminIndemnityAccepted,
    };
    const result = await this.groupService.createGroup(actorId, groupDto, ipAddress);

    const frontend = (this.config.get('FRONTEND_URL') || 'https://app.example.com').replace(/\/+$/,'');
    const url = `${frontend}/join/${result.joinToken}`;
    return { group: result.group, joinUrl: url, token: result.joinToken };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group details' })
  @ApiResponse({ status: 200, description: 'Group details', type: wrapResponse(GroupDetailsResponseDto) })
  async get(@Param('id') id: string) {
    return this.groupService.getGroupDetails(id);
  }

  @Get(':id/my-contributors')
  @ApiOperation({ summary: 'Get current user\'s contributor slots in a group', description: 'Returns the calling user\'s contributor records in the group, whether terms acceptance is required, and whether they have accepted.' })
  @ApiResponse({ status: 200, description: 'User\'s contributor slots', type: wrapResponse(MyGroupStatusResponseDto) })
  async myContributors(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.groupService.getMyStatus(id, req.user?.id);
  }

  // @Get()
  // @ApiOperation({ summary: 'Search groups' })
  // @ApiResponse({ status: 200, description: 'Search results', type: wrapArrayResponse(GroupDetailsResponseDto) })
  // async search(@Query() query: GroupSearchQueryDto, @Req() req: RequestWithUser) {
  //   // query parameters: ?name=...&frequency=WEEKLY&page=1&limit=20&sortBy=createdAt&sortOrder=desc
  //   const q = query || {};
  //   // Convert frequency and status strings to enums if needed
  //   const frequency = (q.frequency && Object.values(Frequency).includes(q.frequency as Frequency)) ? (q.frequency as Frequency) : undefined;
  //   const status = (q.status && Object.values(GroupStatus).includes(q.status as GroupStatus)) ? (q.status as GroupStatus) : undefined;
  //   return this.groupService.searchGroups(
  //     { name: q.name, frequency, status, contributionAmount: q.contributionAmount, contributionAmountMin: q.contributionAmountMin, contributionAmountMax: q.contributionAmountMax, sortBy: q.sortBy, sortOrder: q.sortOrder },
  //     { page: q.page, limit: q.limit },
  //   );
  // }

  @Get('discover/random')
  @ApiOperation({ summary: 'Get random joinable groups for discovery (top 5)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max groups to return (1-10, default 5)' })
  @ApiResponse({ status: 200, description: 'Random joinable groups', schema: { type: 'array', items: { type: 'object' } } })
  async getRandomGroups(@Req() req: RequestWithUser, @Query('limit') limit?: number) {
    const userId = req.user?.id;
    const maxLimit = limit && limit > 0 && limit <= 10 ? limit : 5;
    const groups = await this.groupService.getRandomJoinableGroups(userId, maxLimit);
    return { data: groups };
  }

  @Get(':id/feed')
  @ApiOperation({ summary: 'Get group feed (audit log) for a group', description: 'Only accessible to group contributors and the group admin.' })
  @ApiResponse({ status: 200, description: 'Group feed', type: wrapResponse(GroupFeedResponseDto) })
  async feed(@Req() req: RequestWithUser, @Param('id') id: string, @Query() query: ListQueryDto) {
    await this.groupService.assertGroupContributorOrAdmin(req.user?.id, id);
    return this.groupService.getGroupFeed(id, { page: query.page, limit: query.limit, search: query.search, sortBy: query.sortBy, sortOrder: query.sortOrder as 'asc' | 'desc' });
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a group (begin contributions)' })
  @ApiBody({ schema: { properties: { firstContributionDate: { type: 'string', format: 'date-time', description: 'ISO date for when the first contribution is due (defaults to now if omitted)', example: '2026-05-01T00:00:00.000Z' } } } })
  @ApiResponse({ status: 200, description: 'Group started', type: wrapResponse(OkResponseDto) })
  async startGroup(@Req() req: RequestWithUser, @Param('id') id: string, @Body() body: { firstContributionDate?: string }) {
    const actorId = req.user?.id;
    await this.groupService.assertKycVerified(actorId);
    await this.groupService.assertWalletProvisioned(actorId);
    const firstContributionDate = body.firstContributionDate ? new Date(body.firstContributionDate) : undefined;
    return this.lifecycle.startGroup(actorId, id, { firstContributionDate });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a group', description: 'Name, description, and terms can be updated anytime. Core fields (contributionAmount, frequency, maxSlots, serviceCharge, lateFee) can only be updated before the group starts.' })
  @ApiBody({ type: UpdateGroupDto })
  @ApiResponse({ status: 200, description: 'Group updated', type: wrapResponse(GroupDetailsResponseDto) })
  async update(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateGroupDto) {
    // Convert frequency string to enum if needed
    const updateDto = dto.frequency && Object.values(Frequency).includes(dto.frequency as Frequency)
      ? { ...dto, frequency: dto.frequency as Frequency }
      : dto;
    // Remove terms from updateDto if present
    if ('terms' in updateDto) {
      delete (updateDto as any).terms;
    }
    return this.groupService.updateGroup(req.user?.id, id, updateDto);
  }

  @Post(':id/freeze')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Freeze a group (SUPER_ADMIN only)', description: 'Prevents all mutations on the group until unfrozen.' })
  @ApiBody({ schema: { properties: { reason: { type: 'string', example: 'Under investigation for fraud' } }, required: ['reason'] } })
  @ApiResponse({ status: 200, description: 'Group frozen', type: wrapResponse(OkResponseDto) })
  async freeze(@Req() req: RequestWithUser, @Param('id') id: string, @Body() body: { reason: string }) {
    if (!body.reason) throw new BadRequestException('Reason is required');
    await this.groupService.freezeGroup(req.user?.id, id, body.reason);
    return { ok: true };
  }


  @Delete(':id')
  @ApiOperation({ summary: 'Delete a NOT_STARTED group (admin only)', description: 'Deletes a NOT_STARTED group and all contributors. Hard delete — no audit trail needed.' })
  @ApiBody({ schema: { properties: { reason: { type: 'string', example: 'No longer needed' } } } })
  @ApiResponse({ status: 200, description: 'Group deleted', type: wrapResponse(OkResponseDto) })
  async delete(@Req() req: RequestWithUser, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.groupService.deleteGroup(req.user?.id, id, body.reason);
  }

  @Post(':id/cycles/:cycleId/payout')
  @ApiOperation({ summary: 'Force payout for a cycle (group admin only)', description: 'Marks remaining unpaid/failed contributions as DEFAULTED, completes the cycle, and enqueues the payout. Use after the grace period when some contributors have not paid.' })
  @ApiResponse({ status: 200, description: 'Payout enqueued', type: wrapResponse(OkResponseDto) })
  async forcePayout(@Req() req: RequestWithUser, @Param('id') id: string, @Param('cycleId') cycleId: string) {
    return this.lifecycle.forcePayoutCycle(req.user?.id, id, cycleId);
  }

  @Patch(':id/cycles/:cycleId/reschedule')
  @ApiOperation({ summary: 'Reschedule a PENDING cycle (group admin, no approval needed)', description: 'Directly reschedules a cycle that has not yet started collecting. New date must be in the future, later than the current date, and within one frequency interval. Cascades to all subsequent PENDING cycles. For a COLLECTING cycle, use the reschedule-request endpoint instead.' })
  @ApiBody({ schema: { required: ['contributionDate', 'reason'], properties: { contributionDate: { type: 'string', format: 'date-time', example: '2026-06-01T09:00:00.000Z' }, reason: { type: 'string', example: 'Public holiday — banks will be closed' } } } })
  @ApiResponse({ status: 200, description: 'Cycle rescheduled', type: wrapResponse(OkResponseDto) })
  async rescheduleCycle(@Req() req: RequestWithUser, @Param('id') id: string, @Param('cycleId') cycleId: string, @Body() body: { contributionDate: string; reason: string }) {
    if (!body.contributionDate) throw new BadRequestException('contributionDate is required');
    if (!body.reason?.trim()) throw new BadRequestException('reason is required');
    return this.lifecycle.rescheduleCycle(req.user?.id, id, cycleId, new Date(body.contributionDate), body.reason.trim());
  }

  @Post(':id/cycles/:cycleId/reschedule-request')
  @ApiOperation({ summary: 'Request a cycle reschedule for a COLLECTING cycle (requires super admin approval)', description: 'Raises a CYCLE_RESCHEDULE ticket when the cycle is already collecting contributions. Super admin must approve before any date changes take effect. For a PENDING cycle, use PATCH /groups/:id/cycles/:cycleId/reschedule instead.' })
  @ApiBody({ schema: { required: ['requestedDate', 'reason'], properties: { requestedDate: { type: 'string', format: 'date-time', example: '2026-06-01T09:00:00.000Z' }, reason: { type: 'string', example: 'Public holiday — banks will be closed' } } } })
  @ApiResponse({ status: 201, description: 'Reschedule request submitted for super admin approval', schema: { type: 'object', properties: { ok: { type: 'boolean' }, ticketId: { type: 'string' }, message: { type: 'string' } } } })
  async requestReschedule(@Req() req: RequestWithUser, @Param('id') id: string, @Param('cycleId') cycleId: string, @Body() body: { requestedDate: string; reason: string }) {
    if (!body.requestedDate) throw new BadRequestException('requestedDate is required');
    if (!body.reason?.trim()) throw new BadRequestException('reason is required');
    return this.lifecycle.requestCycleReschedule(req.user?.id, id, cycleId, new Date(body.requestedDate), body.reason.trim());
  }

  @Post('reschedule-requests/:ticketId/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve a cycle reschedule request (SUPER_ADMIN only)', description: 'Executes the cascade reschedule: shifts the target cycle and all subsequent PENDING cycles by the same delta, cancels and reschedules BullMQ jobs, then notifies contributors.' })
  @ApiResponse({ status: 200, description: 'Reschedule approved and executed', type: wrapResponse(OkResponseDto) })
  async approveCycleReschedule(@Req() req: RequestWithUser, @Param('ticketId') ticketId: string) {
    return this.lifecycle.approveCycleReschedule(req.user?.id, ticketId);
  }

  @Post('reschedule-requests/:ticketId/reject')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Reject a cycle reschedule request (SUPER_ADMIN only)' })
  @ApiBody({ schema: { properties: { notes: { type: 'string', example: 'Dates cannot be changed this close to the contribution day.' } } } })
  @ApiResponse({ status: 200, description: 'Reschedule request rejected', type: wrapResponse(OkResponseDto) })
  async rejectCycleReschedule(@Req() req: RequestWithUser, @Param('ticketId') ticketId: string, @Body() body: { notes?: string }) {
    return this.lifecycle.rejectCycleReschedule(req.user?.id, ticketId, body.notes?.trim());
  }

  @Post(':id/settle')
  @ApiOperation({ summary: 'Settle a completed group (admin only)', description: 'Transfers remaining group wallet balance (late fees, etc.) to admin wallet and archives the group.' })
  @ApiResponse({ status: 200, description: 'Group settled', type: wrapResponse(OkResponseDto) })
  async settle(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.groupService.settleGroup(req.user?.id, id);
  }

  @Post(':id/unfreeze')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Unfreeze a group (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Group unfrozen', type: wrapResponse(OkResponseDto) })
  async unfreeze(@Req() req: RequestWithUser, @Param('id') id: string) {
    await this.groupService.unfreezeGroup(req.user?.id, id);
    return { ok: true };
  }
}
