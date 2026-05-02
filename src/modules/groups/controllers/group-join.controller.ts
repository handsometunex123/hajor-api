import { Controller, Post, Patch, UseGuards, Req, Param, Body, BadRequestException, Get, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { GroupJoinService } from '../group-join.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { wrapArrayResponse, wrapResponse } from '../../../common/dto/wrap-response';
import { Prisma, JoinRequestStatus } from '@prisma/client';
import { IdResponseDto } from '../../../common/dto/id-response.dto';
import { OkResponseDto } from '../../../common/dto/ok-response.dto';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';

@ApiTags('Groups')
@Controller('groups/:groupId/join-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class GroupJoinController {
  constructor(private readonly svc: GroupJoinService) {}

  @Get()
  @ApiOperation({ summary: 'List join requests for a group (admin only)' })
  @ApiParam({ name: 'groupId', description: 'The group ID' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status (PENDING, APPROVED, REJECTED)' })
  @ApiResponse({ status: 200, description: 'List of join requests', type: wrapArrayResponse(IdResponseDto) })
  async list(
    @Req() req: RequestWithUser,
    @Param('groupId') groupId: string,
    @Query() query: ListQueryDto & { status?: string }
  ) {
    const actorId = req.user?.id;
    const items = await this.svc.listJoinRequests(actorId, groupId, query.status);
    return { items };
  }

  @Post()
  @ApiOperation({ summary: 'Request to join a group' })
  @ApiParam({ name: 'groupId', description: 'The group ID' })
  @ApiBody({ schema: { properties: { acceptTerms: { type: 'boolean', description: 'User must accept group terms and conditions' } } } })
  @ApiResponse({ status: 200, description: 'Join request created', type: wrapResponse(IdResponseDto) })
  async request(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Body() body: { acceptTerms: boolean }) {
    const userId = req.user?.id;
    return this.svc.requestToJoin(userId, groupId, body.acceptTerms);
  }

  @Patch(':requestId')
  @ApiOperation({ summary: 'Approve or reject a join request' })
  @ApiParam({ name: 'groupId', description: 'The group ID' })
  @ApiParam({ name: 'requestId', description: 'The join request ID' })
  @ApiBody({ schema: { properties: { status: { type: 'string', enum: ['APPROVED', 'REJECTED'] }, acceptIndemnity: { type: 'boolean', description: 'Admin must accept indemnity for the user' } } } })
  @ApiResponse({ status: 200, description: 'Join request updated', type: wrapResponse(OkResponseDto) })
  async updateStatus(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Param('requestId') requestId: string, @Body() body: { status: string, acceptIndemnity?: boolean }) {
    const actorId = req.user?.id;
    if (body.status === 'APPROVED') return this.svc.approveJoinRequest(actorId, requestId, body.acceptIndemnity === true);
    if (body.status === 'REJECTED') return this.svc.rejectJoinRequest(actorId, requestId);
    throw new BadRequestException('status must be APPROVED or REJECTED');
  }
}
