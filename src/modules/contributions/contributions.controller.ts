import { Body, Controller, Post, Param, UseGuards, BadRequestException, Get, Query, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { wrapResponse } from '../../common/dto/wrap-response';
import { ContributionsService } from './contributions.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { ContributionCycleDto } from './dto/contribution-cycle.dto';
import { GroupContributionStatusDto } from './dto/group-contribution-status.dto';
import { DefaulterListResponseDto } from './dto/defaulter-list-response.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { CycleCreatedResponseDto } from './dto/cycle-created-response.dto';
import { RecordPaymentResponseDto } from './dto/record-payment-response.dto';
import { OkResponseDto } from '../../common/dto/ok-response.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('Contributions')
@Controller('contributions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContributionsController {
  constructor(private readonly contributions: ContributionsService) {}

  @Post('cycles')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a contribution cycle (admin only)', description: 'Cycles are normally created automatically when a group starts. This endpoint allows a SUPER_ADMIN to create cycles manually.' })
  @ApiBody({ type: CreateCycleDto })
  @ApiResponse({ status: 200, description: 'Cycle created', type: wrapResponse(CycleCreatedResponseDto) })
  async createCycle(@Body() dto: CreateCycleDto) {
    try {
      const cycle = await this.contributions.createCycle({
        groupId: dto.groupId,
        cycleNumber: dto.cycleNumber,
        contributionDate: new Date(dto.contributionDate),
        payoutDate: new Date(dto.payoutDate),
      });
      return { id: cycle.id };
    } catch (err) {
      throw new BadRequestException(err?.message || 'Failed to create cycle');
    }
  }

  @Get('groups/:id/cycles/current')
  @ApiOperation({ summary: 'Get the current contribution cycle for a group' })
  @ApiResponse({ status: 200, description: 'Current cycle details', type: wrapResponse(ContributionCycleDto) })
  async getCurrentCycle(@Param('id') id: string) {
    try {
      const cycle = await this.contributions.getCurrentCycle(id);
      return cycle;
    } catch (err) {
      throw new BadRequestException(err?.message || 'Failed to get current cycle');
    }
  }

  @Get('groups/:id/status')
  @ApiOperation({ summary: 'Get contribution status for a group' })
  @ApiResponse({ status: 200, description: 'Group contribution status', type: wrapResponse(GroupContributionStatusDto) })
  async getGroupStatus(@Param('id') id: string) {
    try {
      const status = await this.contributions.getGroupContributionStatus(id);
      return status;
    } catch (err) {
      throw new BadRequestException(err?.message || 'Failed to get group contribution status');
    }
  }

  @Get('cycles/:id/defaulters')
  @ApiOperation({ summary: 'List defaulters for a cycle' })
  @ApiResponse({ status: 200, description: 'List of defaulters', type: wrapResponse(DefaulterListResponseDto) })
  async getDefaulters(@Param('id') id: string, @Query() query: ListQueryDto) {
    try {
      return await this.contributions.getDefaulters(id, { page: query.page, limit: query.limit, sortBy: query.sortBy, sortOrder: query.sortOrder as 'asc' | 'desc' });
    } catch (err) {
      throw new BadRequestException(err?.message || 'Failed to get defaulters');
    }
  }

  @Post('payments')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Record a contribution payment (admin only)', description: 'Payments are normally processed automatically via auto-debit. This endpoint allows a SUPER_ADMIN to record payments manually.' })
  @ApiBody({ type: RecordPaymentDto })
  @ApiResponse({ status: 200, description: 'Payment recorded', type: wrapResponse(RecordPaymentResponseDto) })
  async recordPayment(@Body() dto: RecordPaymentDto) {
    try {
      const res = await this.contributions.recordContributionPayment({
        cycleId: dto.cycleId,
        groupContributorId: dto.groupContributorId,
        reference: dto.reference,
        amount: dto.amount,
        payerWalletId: dto.payerWalletId,
      });
      return { paymentId: res.payment.id, transactionId: res.transaction?.id };
    } catch (err) {
      throw new BadRequestException(err?.message || 'Failed to record payment');
    }
  }

  @Patch('cycles/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update cycle status (admin only)', description: 'Mark a cycle as complete. Normally handled automatically by the system.' })
  @ApiBody({ schema: { properties: { status: { type: 'string', enum: ['COMPLETE'] } } } })
  @ApiResponse({ status: 200, description: 'Cycle updated', type: wrapResponse(ContributionCycleDto) })
  async updateCycleStatus(@Param('id') id: string, @Body() body: { status: string }) {
    if (body.status !== 'COMPLETE') throw new BadRequestException('Only status=COMPLETE is supported');
    try {
      const cycle = await this.contributions.completeCycle(id);
      return { id: cycle.id, status: cycle.status };
    } catch (err) {
      throw new BadRequestException(err?.message || 'Failed to complete cycle');
    }
  }

  @Patch('payments/:id/mark-paid')
  @ApiOperation({ summary: 'Admin override: mark a FAILED payment as PAID', description: 'Used when a defaulter has been covered by the admin or paid outside the system. Marks the payment PAID and triggers cycle completion check.' })
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBody({ schema: { properties: { reason: { type: 'string', example: 'Admin covered defaulter' } } } })
  @ApiResponse({ status: 200, description: 'Payment marked as paid', type: wrapResponse(OkResponseDto) })
  async adminMarkPaid(@Req() req: RequestWithUser, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.contributions.adminMarkPaymentPaid(id, req.user?.id, body.reason);
  }

  @Post('cycles/:id/retry-failed')
  @ApiOperation({ summary: 'Re-enqueue retry job for failed payments in a cycle', description: 'Admin triggers another auto-debit attempt for all FAILED payments in a cycle.' })
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiResponse({ status: 200, description: 'Retry job enqueued', type: wrapResponse(OkResponseDto) })
  async retryFailed(@Param('id') id: string) {
    return this.contributions.enqueueRetryFailed(id);
  }

  @Patch('payments/:id/waive-late-fee')
  @ApiOperation({ summary: 'Waive a late fee charged on a payment', description: 'Reverses the late fee double-entry transaction, refunding the user.' })
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBody({ schema: { properties: { reason: { type: 'string', example: 'Compassionate waiver' } } } })
  @ApiResponse({ status: 200, description: 'Late fee waived', type: wrapResponse(OkResponseDto) })
  async waiveLateFee(@Req() req: RequestWithUser, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.contributions.waiveLateFee(id, req.user?.id, body.reason);
  }
}
