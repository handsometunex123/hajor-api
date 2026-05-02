import { Controller, Post, Body, Logger, Req, Headers, BadRequestException, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { Request } from 'express';
import { PaymentWebhookService } from './payment-webhook.service';
import { ProviderChargeDto, ProviderPayoutDto } from './payment-webhook.dto';
import { PaystackService } from '../../infrastructure/paystack/paystack.service';
import { PaystackAdapter } from '../../infrastructure/payments/paystack.adapter';
import { ReconciliationService } from './reconciliation.service';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { wrapResponse } from '../../common/dto/wrap-response';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProcessedResponseDto } from '../../common/dto/processed-response.dto';

@ApiTags('Payments')
@Controller('webhooks/payments')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);
  constructor(private readonly webhook: PaymentWebhookService, private readonly paystack: PaystackService, private readonly adapter: PaystackAdapter, private readonly recon: ReconciliationService) {}

  @Post('charge')
  @Public()
  @ApiOperation({ summary: 'Provider charge webhook (create or update internal tx)' })
  @ApiBody({ type: ProviderChargeDto })
  @ApiResponse({ status: 200, description: 'Webhook processed', type: wrapResponse(ProcessedResponseDto) })
  async charge(@Req() req: Request, @Headers() headers: any, @Body() body: ProviderChargeDto) {
    this.logger.log(`Received provider charge webhook provider=${body.provider} providerId=${body.providerId}`);
    if (body.provider === 'paystack') {
      const signature = headers['x-paystack-signature'] as string | undefined;
      const raw = (req as any).rawBody ? (req as any).rawBody.toString() : JSON.stringify(req.body);
      const ok = this.paystack.verifySignature(raw, signature);
      if (!ok) throw new BadRequestException('Invalid paystack signature');
    }

    const tx = await this.webhook.handleProviderCharge({
      provider: body.provider,
      providerId: body.providerId,
      walletOwnerId: body.walletOwnerId,
      reference: body.reference,
      amount: body.amount,
      metadata: body.metadata,
    });
    return { ok: true, txId: tx.id };
  }

  @Post('confirm')
  @Public()
  @ApiOperation({ summary: 'Provider confirmation webhook (settlement/failed)' })
  @ApiBody({ schema: { example: { provider: 'paystack', providerId: 'abc', reference: 'ref|ref:paymentId', event: 'success' } } })
  @ApiResponse({ status: 200, description: 'Confirmation processed', type: wrapResponse(ProcessedResponseDto) })
  async confirm(@Req() req: Request, @Headers() headers: any, @Body() body: any) {
    // Generic confirmation endpoint: map provider webhook to a settlement confirmation
    const provider = body.provider || body.event?.provider || 'paystack';
    const providerId = body.providerId || body.data?.id || body.data?.reference || body.data?.transaction?.id;
    const reference = body.reference || body.data?.reference || body.data?.transaction?.reference || null;
    const amount = body.amount || body.data?.amount || (body.data && body.data.amount / 100) || null;

    if (provider === 'paystack') {
      const signature = headers['x-paystack-signature'] as string | undefined;
      const raw = (req as any).rawBody ? (req as any).rawBody.toString() : JSON.stringify(req.body);
      const ok = this.paystack.verifySignature(raw, signature);
      if (!ok) throw new BadRequestException('Invalid paystack signature');
    }

    const res = await this.webhook.confirmProviderCharge({ provider, providerId, reference, amount, providerStatus: body.event || body.data?.status });
    if (res && (res as any).found === false) {
      // try transfer confirmation path (withdraw/transfer)
      return this.webhook.confirmProviderTransfer({ provider, providerId, reference, amount, providerStatus: body.event || body.data?.status });
    }
    return res;
  }

  @Post('payout')
  @Public()
  @ApiOperation({ summary: 'Provider payout webhook' })
  @ApiBody({ type: ProviderPayoutDto })
  @ApiResponse({ status: 200, description: 'Payout webhook processed', type: wrapResponse(ProcessedResponseDto) })
  async payout(@Req() req: Request, @Headers() headers: any, @Body() body: ProviderPayoutDto) {
    this.logger.log(`Received provider payout webhook provider=${body.provider} providerId=${body.providerId}`);
    if (body.provider === 'paystack') {
      const signature = headers['x-paystack-signature'] as string | undefined;
      const raw = (req as any).rawBody ? (req as any).rawBody.toString() : JSON.stringify(req.body);
      const ok = this.paystack.verifySignature(raw, signature);
      if (!ok) throw new BadRequestException('Invalid paystack signature');
    }

    const tx = await this.webhook.handleProviderPayout({ provider: body.provider, providerId: body.providerId, reference: body.reference, amount: body.amount, metadata: body.metadata });
    return { ok: true, txId: tx.id };
  }

  @Post('paystack')
  @Public()
  @ApiOperation({ summary: 'Paystack native webhook handler (virtual-account deposits, generic events)' })
  @ApiResponse({ status: 200, description: 'Webhook processed', type: wrapResponse(ProcessedResponseDto) })
  async paystackWebhook(@Req() req: Request, @Headers() headers: any, @Body() body: any) {
    // verify signature
    const signature = headers['x-paystack-signature'] as string | undefined;
    const raw = (req as any).rawBody ? (req as any).rawBody.toString() : JSON.stringify(req.body);
    const ok = this.paystack.verifySignature(raw, signature);
    if (!ok) throw new BadRequestException('Invalid paystack signature');

    const event = body?.event || body?.eventName || null;
    const data = body?.data || body;

    // delegate to adapter which centralizes Paystack parsing
    const res = await this.adapter.handleEvent({ event, data, raw: body });
    // If adapter returned handled=false, fallback to generic confirm
    if (res && (res as any).handled === false) {
      return this.confirm(req, headers, body);
    }
    return res;
  }

  @Post('admin/reconciliations/paystack')
  @ApiOperation({ summary: 'Admin: run paystack reconciliation (manual trigger)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiResponse({ status: 200, description: 'Reconciliation result', type: wrapResponse(ProcessedResponseDto) })
  async adminReconcile() {
    return this.recon.reconcilePending();
  }
}
