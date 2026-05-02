import { Controller, Post, Put, Req, Param, UseGuards, Body, Get, Patch, Delete, Query, Res, BadRequestException } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { GroupInviteService } from '../group-invite.service';
import { UsersService } from '../../users/users.service';
import { OnboardInviteDto } from '../../users/dto/onboard-invite.dto';
import { CreateInviteDto } from '../dto/create-invite.dto';
import { CreateContactInviteDto } from '../dto/create-contact-invite.dto';
import { ProxyRegisterInitDto } from '../dto/proxy-register-init.dto';
import { ProxyRegisterConfirmDto } from '../dto/proxy-register-confirm.dto';
import { IdResponseDto } from '../../../common/dto/id-response.dto';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { OkResponseDto } from '../../../common/dto/ok-response.dto';
import { JoinLinkResponseDto } from '../dto/join-link-response.dto';
import { InviteListResponseDto } from '../dto/invite-list-response.dto';
import { InviteListQueryDto } from '../dto/invite-list-query.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { wrapResponse } from '../../../common/dto/wrap-response';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';
import * as QRCode from 'qrcode';

@ApiTags('Groups')
@Controller('groups/:groupId/invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class GroupInviteController {
  constructor(private readonly svc: GroupInviteService, private readonly config: ConfigService) {}

  @Post()
  @ApiOperation({ summary: 'Invite a user to the group' })
  @ApiBody({ type: CreateInviteDto })
  @ApiResponse({ status: 200, description: 'Invite created', type: wrapResponse(IdResponseDto) })
  async invite(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Body() body: CreateInviteDto) {
    return this.svc.createInvite(req.user?.id, groupId, body.userId);
  }

  @Post('contact')
  @ApiOperation({ summary: 'Invite a non-app user by contact info (sends OTP)' })
  @ApiBody({ type: CreateContactInviteDto })
  @ApiResponse({ status: 200, description: 'Contact invite created', type: wrapResponse(IdResponseDto) })
  async inviteContact(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Body() body: CreateContactInviteDto) {
    return this.svc.createContactInvite(req.user?.id, groupId, { firstName: body.firstName, lastName: body.lastName, email: body.email, phone: body.phone });
  }

  @Get()
  @ApiOperation({ summary: 'List pending invites for group' })
  @ApiResponse({ status: 200, description: 'List of invites', type: wrapResponse(InviteListResponseDto) })
  async list(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Query() query: ListQueryDto) {
    return this.svc.listPendingInvites(req.user?.id, groupId, { page: query.page, limit: query.limit, search: query.search, sortBy: query.sortBy, sortOrder: query.sortOrder as 'asc' | 'desc' });
  }

  @Post('proxy-registrations/init')
  @ApiOperation({
    summary: 'Step 1 – Admin initiates proxy registration: sends OTP via SMS to the user',
    description: 'An OTP is sent to the provided phone number. The user reads the OTP back to the admin verbally, confirming consent before the admin proceeds to confirm.',
  })
  @ApiBody({ type: ProxyRegisterInitDto })
  @ApiResponse({ status: 200, description: 'OTP dispatched', schema: { example: { message: 'OTP sent to user phone', phone: '+2348012345678', expiresInSeconds: 600 } } })
  async proxyRegisterInit(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Body() body: ProxyRegisterInitDto) {
    return this.svc.proxyRegisterInit(req.user?.id, groupId, body);
  }

  @Post('proxy-registrations/confirm')
  @ApiOperation({
    summary: 'Step 2 – Admin confirms OTP read back by user, completing proxy registration',
    description: 'Validates the OTP, creates the user account (role: PROXY, notificationChannel: SMS), provisions a wallet, adds the user to the group, and sends a temporary password via SMS.',
  })
  @ApiBody({ type: ProxyRegisterConfirmDto })
  @ApiResponse({ status: 200, description: 'Proxy user created and added to group' })
  async proxyRegisterConfirm(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Body() body: ProxyRegisterConfirmDto) {
    return this.svc.proxyRegisterConfirm(req.user?.id, groupId, body);
  }
}

// ─── Join Link ───────────────────────────────────────────────────────────────
// Singleton resource: a group has at most one active join link at a time.
// PUT  /                creates the link if none exists, rotates the token if one does
// GET  /                retrieve current link + shareable URL
// PATCH /               toggle status   { status: "PAUSED" | "ACTIVE" }
// DELETE /              revoke (hard-delete the link)
// GET  /qrcode          return a QR code PNG for the current link
@ApiTags('Groups')
@Controller('groups/:groupId/join-link')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class GroupJoinLinkController {
  constructor(private readonly svc: GroupInviteService, private readonly config: ConfigService) {}

  private buildUrl(token: string): string {
    const frontend = (this.config.get('FRONTEND_URL') || 'https://app.example.com').replace(/\/+$/, '');
    return `${frontend}/join/${token}`;
  }

  @Put()
  @ApiOperation({
    summary: 'Create or regenerate the group join link',
    description: 'Admin-only. Creates the join link if none exists. If one already exists its token is rotated. Use this single endpoint instead of separate create/regenerate calls.',
  })
  @ApiResponse({ status: 200, description: 'Join link created or regenerated', type: wrapResponse(JoinLinkResponseDto) })
  async upsert(@Req() req: RequestWithUser, @Param('groupId') groupId: string) {
    const link = await this.svc.upsertJoinLink(req.user?.id, groupId);
    return { url: this.buildUrl(link.token), token: link.token };
  }

  @Get()
  @ApiOperation({ summary: 'Get the active join link', description: 'Available to the group admin and any existing contributor.' })
  @ApiResponse({ status: 200, description: 'Current join link', type: wrapResponse(JoinLinkResponseDto) })
  async get(@Req() req: RequestWithUser, @Param('groupId') groupId: string) {
    const link = await this.svc.getJoinLink(req.user?.id, groupId);
    return { url: this.buildUrl(link.token), token: link.token };
  }

  @Get('qrcode')
  @ApiOperation({ summary: 'Get a QR code PNG for the current join link' })
  @ApiResponse({ status: 200, description: 'QR code image (PNG)', schema: { type: 'string', format: 'binary' } })
  async qrcode(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Res() res: Response) {
    const link = await this.svc.getJoinLink(req.user?.id, groupId);
    const qrBuffer = await QRCode.toBuffer(this.buildUrl(link.token), { type: 'png', width: 300, margin: 2, errorCorrectionLevel: 'M' });
    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `inline; filename="group-${groupId}-qrcode.png"`);
    res.send(qrBuffer);
  }

  @Patch()
  @ApiOperation({ summary: 'Pause or resume the join link', description: 'Admin-only. A paused link rejects new join attempts without being deleted.' })
  @ApiBody({ schema: { properties: { status: { type: 'string', enum: ['PAUSED', 'ACTIVE'] } } } })
  @ApiResponse({ status: 200, description: 'Status updated', type: wrapResponse(OkResponseDto) })
  async updateStatus(@Req() req: RequestWithUser, @Param('groupId') groupId: string, @Body() body: { status: string }) {
    if (body.status === 'PAUSED') return this.svc.pauseJoinLink(req.user?.id, groupId);
    if (body.status === 'ACTIVE') return this.svc.resumeJoinLink(req.user?.id, groupId);
    throw new BadRequestException('status must be PAUSED or ACTIVE');
  }

  @Delete()
  @ApiOperation({ summary: 'Revoke the join link', description: 'Admin-only. Hard-deletes the link. Use PUT to issue a fresh one afterwards.' })
  @ApiResponse({ status: 200, description: 'Link revoked', type: wrapResponse(OkResponseDto) })
  async revoke(@Req() req: RequestWithUser, @Param('groupId') groupId: string) {
    return this.svc.revokeJoinLink(req.user?.id, groupId);
  }
}

@ApiTags('Invitations')
@Controller('invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class InviteActionController {
  constructor(private readonly svc: GroupInviteService) {}

  @Get()
  @ApiOperation({ summary: 'List my received invitations' })
  @ApiResponse({ status: 200, description: 'List of invitations' })
  async listMine(@Req() req: RequestWithUser, @Query() query: InviteListQueryDto) {
    return this.svc.listMyInvites(req.user?.id, { page: query.page, limit: query.limit, status: query.status, sortBy: query.sortBy, sortOrder: query.sortOrder as 'asc' | 'desc' });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Accept or reject an invite' })
  @ApiBody({ schema: { properties: { status: { type: 'string', enum: ['ACCEPTED', 'REJECTED'] } } } })
  @ApiResponse({ status: 200, description: 'Invite updated', type: wrapResponse(OkResponseDto) })
  async updateStatus(@Req() req: RequestWithUser, @Param('id') id: string, @Body() body: { status: string }) {
    const userId = req.user?.id;
    if (body.status === 'ACCEPTED') return this.svc.acceptInvite(userId, id);
    if (body.status === 'REJECTED') return this.svc.rejectInvite(userId, id);
    throw new BadRequestException('status must be ACCEPTED or REJECTED');
  }
}

@ApiTags('Groups')
@Controller('join')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class JoinLinkController {
  constructor(private readonly svc: GroupInviteService) {}

  @Post(':token')
  @ApiOperation({ summary: 'Join a group using a join link token' })
  @ApiParam({ name: 'token', description: 'The join link token' })
  @ApiResponse({ status: 200, description: 'Successfully joined the group', type: wrapResponse(OkResponseDto) })
  async consume(@Req() req: RequestWithUser, @Param('token') token: string) {
    const userId = req.user?.id;
    return this.svc.consumeJoinLink(userId, token);
  }
}

// Public invite actions (unauthenticated)
@ApiTags('Invites')
@Controller('invites')
export class PublicInviteController {
  constructor(private readonly inviteSvc: GroupInviteService, private readonly usersSvc: UsersService) {}

  @Post(':id/onboard')
  @Public()
  @ApiOperation({ summary: 'Complete onboarding for an invited user (no auth)' })
  @ApiBody({ type: OnboardInviteDto })
  @ApiResponse({ status: 200, description: 'Onboarding completed', type: wrapResponse(OkResponseDto) })
  async onboard(@Param('id') inviteId: string, @Body() body: OnboardInviteDto) {
    const invite = await this.inviteSvc.getInviteById(inviteId);
    if (!invite) throw new Error('Invite not found');
    // If the invitation is not yet linked to a user, create the user and wallet now
    if (!invite.userId) {
      return this.usersSvc.registerFromInvite(inviteId, {
        token: body.token,
        password: body.password,
        transactionPin: body.transactionPin,
        phone: body.phone,
        bvn: body.bvn,
        bvnValidationToken: body.bvnValidationToken,
        firstName: body.firstName,
        lastName: body.lastName,
        dob: body.dob,
        address: body.address,
        utilityBillUrl: body.utilityBillUrl,
      });
    }

    // delegate to UsersService to complete onboarding for an existing placeholder user
    return this.usersSvc.completeInviteOnboarding(invite.userId, {
      inviteId,
      password: body.password,
      transactionPin: body.transactionPin,
      bvn: body.bvn,
      bvnValidationToken: body.bvnValidationToken,
      phone: body.phone,
      firstName: body.firstName,
      lastName: body.lastName,
      dob: body.dob,
      address: body.address,
      utilityBillUrl: body.utilityBillUrl,
    });
  }
}
