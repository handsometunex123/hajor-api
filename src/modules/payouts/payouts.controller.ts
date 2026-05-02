import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { wrapResponse } from '../../common/dto/wrap-response';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ExecutePayoutDto } from './dto/execute-payout.dto';
import { PayoutResponseDto } from './dto/payout-response.dto';
import { QueueService } from '../../infrastructure/queue/queue.service';

@ApiTags('Payouts')
@Controller('payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService, private readonly queue: QueueService) {}

  @Post()
  @ApiOperation({ summary: 'Execute payout for a cycle (sync)' })
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBody({ type: ExecutePayoutDto })
  @ApiResponse({ status: 200, description: 'Payout executed', type: wrapResponse(PayoutResponseDto) })
  async execute(@Body() body: ExecutePayoutDto) {
    try {
      const res = await this.payouts.executeCyclePayout(body.cycleId);
      return { ok: !!res };
    } catch (err) {
      throw new BadRequestException(err?.message || 'Payout execution failed');
    }
  }

  @Post('retry')
  @ApiOperation({ summary: 'Re-enqueue a payout job for a cycle (async via worker)', description: 'Use when a payout job failed after all automatic retries. Enqueues a new payout job for the given cycle.' })
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBody({ type: ExecutePayoutDto })
  @ApiResponse({ status: 200, description: 'Payout job re-enqueued' })
  async retry(@Body() body: ExecutePayoutDto) {
    await this.queue.addPayoutJob('process-payout', { cycleId: body.cycleId }, { jobId: `retry_payout_${body.cycleId}_${Date.now()}` });
    return { ok: true, message: 'Payout job enqueued' };
  }

  @Post('reconcile')
  @ApiOperation({ summary: 'Trigger a reconciliation run (SUPER_ADMIN only)', description: 'Enqueues a one-off Paystack reconciliation job for the reconciliation worker.' })
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiResponse({ status: 200, description: 'Reconciliation job enqueued' })
  async triggerReconciliation() {
    await this.queue.triggerReconciliation();
    return { ok: true, message: 'Reconciliation job enqueued' };
  }
}
