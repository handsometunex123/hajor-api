import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaystackService } from '../../infrastructure/paystack/paystack.service';
import { PaymentWebhookService } from './payment-webhook.service';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);
  constructor(private readonly prisma: PrismaService, private readonly paystack: PaystackService, private readonly webhook: PaymentWebhookService) {}

  /**
   * Reconcile recent PENDING transactions by checking Paystack for status and confirming locally.
   */
  async reconcilePending(limit = 200) {
    this.logger.log('Starting reconciliation of pending transactions');
    const pending = await this.prisma.transaction.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: limit });
    for (const tx of pending) {
      try {
        const refMatch = tx.reference.match(/\|ref:(.+)$/);
        const ref = refMatch ? refMatch[1] : tx.reference;
        if (!ref) continue;
        // Ask Paystack about this reference
        try {
          const res = await this.paystack.getTransaction(ref);
          const status = res?.data?.status || res?.data?.transaction?.status || null;
          const providerId = res?.data?.id || res?.data?.transaction?.id || null;
          if (status && /success/i.test(status)) {
            await this.webhook.confirmProviderCharge({ provider: 'paystack', providerId: providerId || 'unknown', reference: ref, amount: res?.data?.amount ? (res.data.amount / 100) : undefined, providerStatus: status });
          } else if (status && /failed|error/i.test(status)) {
            await this.webhook.confirmProviderCharge({ provider: 'paystack', providerId: providerId || 'unknown', reference: ref, amount: res?.data?.amount ? (res.data.amount / 100) : undefined, providerStatus: status });
          }
        } catch (err) {
          this.logger.debug(`Could not fetch paystack transaction for ref=${ref}: ${err?.message || err}`);
        }
      } catch (err) {
        this.logger.warn('Error reconciling transaction', err?.message || err);
      }
    }
    this.logger.log('Reconciliation run complete');
    return { checked: pending.length };
  }
}
