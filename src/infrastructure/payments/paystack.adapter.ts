import { Injectable, Logger } from '@nestjs/common';
import { ProviderAdapter, ProviderAdapterEvent } from './provider-adapter.interface';
import { PaystackService } from '../paystack/paystack.service';
import { PaymentWebhookService } from '../../modules/payments/payment-webhook.service';

@Injectable()
export class PaystackAdapter implements ProviderAdapter {
  private readonly logger = new Logger(PaystackAdapter.name);
  constructor(private readonly paystack: PaystackService, private readonly webhook: PaymentWebhookService) {}

  verifySignature(rawBody: string, signatureHeader?: string) {
    return this.paystack.verifySignature(rawBody, signatureHeader);
  }

  async handleEvent(evt: ProviderAdapterEvent) {
    const event = evt.event;
    const data = evt.data;

    // common normalizations
    const amountRaw = data?.amount ?? data?.transaction?.amount ?? null;
    let amount = amountRaw;
    if (typeof amount === 'number' && amount > 1000) amount = amount / 100;

    const providerId = data?.id || data?.transaction?.id || data?.reference || null;
    const reference = data?.reference || data?.transaction?.reference || null;

    // deposit / charge success events
    if (event && /charge\.success|invoice\.payment|deposit/i.test(event)) {
      return this.webhook.handleProviderDeposit({ provider: 'paystack', providerId: providerId || reference || 'unknown', reference, amount, metadata: data });
    }

    // confirmations / settlement
    if (event && /charge\.success|charge\.failed|transfer\.success|transfer\.failed/i.test(event)) {
      // treat as generic confirmation
      const status = data?.status || event;
      return this.webhook.confirmProviderCharge({ provider: 'paystack', providerId: providerId || reference || 'unknown', reference, amount, providerStatus: status });
    }

    // fallback - return raw
    this.logger.debug(`Unhandled paystack event ${event}`);
    return { ok: true, handled: false };
  }
}
