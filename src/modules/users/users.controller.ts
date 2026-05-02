import { Controller, Get, Query, Post, Patch, Param, Body, Req, NotFoundException, HttpCode, ForbiddenException, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { wrapResponse } from '../../common/dto/wrap-response';
import { OnboardInviteDto } from './dto/onboard-invite.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';
import { OkResponseDto } from '../../common/dto/ok-response.dto';
import { UserLiteDto } from './dto/user-lite.dto';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { IsString } from 'class-validator';
import { VerifyBvnDto } from './dto/verify-bvn.dto';
import { ChangeTransactionPinDto } from './dto/change-transaction-pin.dto';
import { ResetTransactionPinDto } from './dto/reset-transaction-pin.dto';
import { MyGroupsResponseDto } from '../groups/dto/my-groups-response.dto';
import { MyGroupsQueryDto } from './dto/my-groups-query.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';



@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the authenticated user\'s own profile' })
  @ApiResponse({ status: 200, description: 'Current user profile', type: wrapResponse(UserLiteDto) })
  async getMe(@Req() req: RequestWithUser) {
    const userId = req.user?.id;
    const profile = await this.users.getProfile(userId);
    if (!profile) throw new NotFoundException('User not found');
    return profile;
  }

  @Get('me/groups')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all groups the authenticated user belongs to', description: 'Returns every group the user has a contributor slot in, including groups they administer. Multiple slots in the same group are merged under a single entry.' })
  @ApiResponse({ status: 200, description: 'User\'s groups', type: wrapResponse(MyGroupsResponseDto) })
  async myGroups(@CurrentUser() user: { id: string }, @Query() query: MyGroupsQueryDto) {
    return this.users.getMyGroups(user.id, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      status: query.status,
      frequency: query.frequency,
      isAdmin: query.isAdmin,
    });
  }

  @Get('me/referrals')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get referral stats for the authenticated user', description: 'Returns the user\'s referral code, total number of users who signed up using it, and how many of those have completed KYC onboarding.' })
  @ApiResponse({ status: 200, description: 'Referral stats' })
  async myReferrals(@CurrentUser() user: { id: string }) {
    return this.users.getReferralStats(user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List users (paginated)',
    description: 'Group admins can list all users except super admins. Super admins can list all users including other super admins.',
  })
  @ApiResponse({ status: 200, description: 'List of users', type: wrapResponse(PaginatedUsersResponseDto) })
  async list(@Req() req: RequestWithUser, @Query() query: ListUsersDto) {
    const caller = req.user as any;
    const isSuperAdmin = caller?.role === 'SUPER_ADMIN';

    if (!isSuperAdmin) {
      // Non-super-admins must own at least one group to access this endpoint
      const groupCount = await this.users.countAdminGroups(caller?.id);
      if (groupCount === 0) throw new ForbiddenException('Only group admins or super admins can list users');
    }

    return await this.users.listUsers(query, { excludeSuperAdmins: !isSuperAdmin });
  }

  @Post('bvn-verification')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit BVN for verification' })
  @ApiBody({ type: VerifyBvnDto })
  @ApiResponse({ status: 200, description: 'BVN processed', type: wrapResponse(OkResponseDto) })
  async verifyBvn(@Req() req: RequestWithUser, @Body() body: VerifyBvnDto) {
    const userId = req.user?.id;
    return await this.users.validateBvnAndSet(userId, body);
  }

  @Post(':id/onboarding')
  @Public()
  @ApiOperation({ summary: 'Complete onboarding for invited user (set password/profile)' })
  @ApiBody({ type: OnboardInviteDto })
  @ApiResponse({ status: 200, description: 'Onboarding completed', type: wrapResponse(OkResponseDto) })
  async onboardInvite(@Param('id') userId: string, @Body() body: OnboardInviteDto) {
    return await this.users.completeInviteOnboarding(userId, body as any);
  }

  @Post(':id/upgrade')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Upgrade a PROXY user to full USER', description: 'Changes role from PROXY to USER and sets notification channel to EMAIL.' })
  @ApiResponse({ status: 200, description: 'User upgraded', type: wrapResponse(OkResponseDto) })
  async upgradeProxy(@Req() req: RequestWithUser, @Param('id') userId: string) {
    return await this.users.upgradeProxyToUser(userId, req.user?.id);
  }

  @Patch('me/transaction-pin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Change transaction PIN', description: 'Requires the current PIN and a new 6-digit PIN.' })
  @ApiBody({ type: ChangeTransactionPinDto })
  @ApiResponse({ status: 200, description: 'PIN changed successfully', type: wrapResponse(OkResponseDto) })
  async changeTransactionPin(@CurrentUser() user: { id: string }, @Body() body: ChangeTransactionPinDto) {
    return this.users.changeTransactionPin(user.id, body.currentPin, body.newPin);
  }

  @Post('me/transaction-pin/reset')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset transaction PIN via account password', description: 'Use this when the current PIN is forgotten. Requires the account password to confirm identity.' })
  @ApiBody({ type: ResetTransactionPinDto })
  @ApiResponse({ status: 200, description: 'PIN reset successfully', type: wrapResponse(OkResponseDto) })
  async resetTransactionPin(@CurrentUser() user: { id: string }, @Body() body: ResetTransactionPinDto) {
    return this.users.resetTransactionPin(user.id, body.password, body.newPin);
  }
}
