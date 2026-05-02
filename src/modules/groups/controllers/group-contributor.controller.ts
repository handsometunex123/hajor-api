import { Controller, Get, Post, Patch, Query, UseGuards, Req, Param, Body, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { GroupContributorService } from '../group-contributor.service';
import { ContributorSwapService } from '../contributor-swap.service';
import { SwapPayoutDto } from '../dto/swap-payout.dto';
import { IdResponseDto } from '../../../common/dto/id-response.dto';
import { OkResponseDto } from '../../../common/dto/ok-response.dto';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { wrapResponse } from '../../../common/dto/wrap-response';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';
import { ContributorListResponseDto, ContributorItemDto } from '../dto/contributor-list-response.dto';
import { GroupService } from '../group.service';

@ApiTags('Groups')
@Controller('groups/:groupId/contributors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class GroupContributorController {
  constructor(
    private readonly svc: GroupContributorService,
    private readonly swapSvc: ContributorSwapService,
    private readonly groupService: GroupService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all contributors in a group', description: 'Returns contributors with their user details, displayId and payout order. Supports pagination, sorting (joinedAt, payoutOrder) and search by displayId, name or email.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Filter by displayId (contributor code), first name, last name or email' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['joinedAt', 'payoutOrder'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiResponse({ status: 200, description: 'Paginated list of group contributors.', type: wrapResponse(ContributorListResponseDto) })
  async list(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Query() query: ListQueryDto) {
    await this.groupService.assertGroupContributorOrAdmin(req.user?.id, groupId);
    return this.svc.listContributors(groupId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Post('me')
  @ApiOperation({ summary: 'Add yourself as a contributor in a group', description: 'Adds the authenticated user as a contributor (up to 2 slots). Group admins use this to join their own group. Existing contributors use it to claim a second slot. Group must be NOT_STARTED and have free slots.' })
  @ApiResponse({ status: 200, description: 'Contributor slot added', type: wrapResponse(IdResponseDto) })
  async addSelf(@Req() req: RequestWithUser, @Param('groupId') groupId: string) {
    const userId = req.user?.id;
    return this.svc.addSelfSlot(userId, groupId);
  }

  @Delete(':contributorId')
  @ApiOperation({ summary: 'Remove a contributor from group' })
  @ApiResponse({ status: 200, description: 'Contributor removed', type: wrapResponse(OkResponseDto) })
  async remove(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Param('contributorId') contributorId: string) {
    const actorId = req.user?.id;
    return this.svc.removeContributor(actorId, groupId, contributorId);
  }

  @Patch('payout-order')
  @ApiOperation({
    summary: 'Swap payout order between two contributors',
    description: 'Admin-only. If the group is NOT_STARTED the swap is applied immediately. If the group is STARTED a swap request is created and both contributors must approve before the swap is executed.',
  })
  @ApiBody({ type: SwapPayoutDto })
  @ApiResponse({ status: 200, description: 'Payout order updated or swap request created', type: wrapResponse(OkResponseDto) })
  async swap(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Body() dto: SwapPayoutDto) {
    const actorId = req.user?.id;
    return this.swapSvc.swap(actorId, groupId, dto.contributorAId, dto.contributorBId);
  }

  @Post(':contributorId/terms-acceptance')
  @ApiOperation({ summary: 'Accept group terms for a contributor slot', description: 'Contributors must accept the group terms before the group can start. Admin slots are auto-accepted.' })
  @ApiResponse({ status: 200, description: 'Terms accepted', type: wrapResponse(OkResponseDto) })
  async acceptTerms(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Param('contributorId') contributorId: string) {
    const userId = req.user?.id;
    return this.svc.acceptTerms(userId, groupId, contributorId);
  }

  @Post('terms-nudges')
  @ApiOperation({ summary: 'Send terms acceptance reminders', description: 'Admin-only. Sends a notification to every contributor who has not yet accepted the group terms.' })
  @ApiResponse({ status: 200, description: 'Nudge results', schema: { properties: { sent: { type: 'number' }, total: { type: 'number' } } } })
  async nudgeTerms(@Req() req: RequestWithUser, @Param('groupId') groupId: string) {
    const adminId = req.user?.id;
    return this.svc.nudgeTerms(adminId, groupId);
  }
}

@ApiTags('Groups')
@Controller('groups/:groupId/swap-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ContributorSwapController {
  constructor(private readonly swapSvc: ContributorSwapService) {}

  @Get()
  @ApiOperation({ summary: 'List swap requests for a group', description: 'Admin-only. Returns all swap requests with contributor and user details.' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], description: 'Filter by swap request status' })
  @ApiResponse({ status: 200, description: 'List of swap requests' })
  async list(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Query('status') status?: string) {
    return this.swapSvc.listSwapRequests(req.user?.id, groupId, status);
  }

  @Post(':requestId/approve')
  @ApiOperation({ summary: 'Approve a swap request', description: 'Called by one of the two contributors involved in the swap. When both have approved the swap is executed automatically.' })
  @ApiResponse({ status: 200, description: 'Approval recorded. Returns EXECUTED when both parties have approved, or AWAITING_OTHER_APPROVAL otherwise.' })
  async approve(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Param('requestId') requestId: string) {
    return this.swapSvc.approveSwapRequest(req.user?.id, groupId, requestId);
  }

  @Post(':requestId/reject')
  @ApiOperation({ summary: 'Reject a swap request', description: 'Called by one of the two contributors involved in the swap. Marks the request as REJECTED and notifies the admin.' })
  @ApiResponse({ status: 200, description: 'Swap request rejected', type: wrapResponse(OkResponseDto) })
  async reject(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Param('requestId') requestId: string) {
    return this.swapSvc.rejectSwapRequest(req.user?.id, groupId, requestId);
  }

  @Delete(':requestId')
  @ApiOperation({ summary: 'Cancel a swap request', description: 'Admin-only. Cancels a pending swap request.' })
  @ApiResponse({ status: 200, description: 'Swap request cancelled', type: wrapResponse(OkResponseDto) })
  async cancel(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Param('requestId') requestId: string) {
    return this.swapSvc.cancelSwapRequest(req.user?.id, groupId, requestId);
  }
}
