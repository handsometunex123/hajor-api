import { Injectable, Logger } from '@nestjs/common';
import { TransactionsService } from '../transactions/transactions.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { FraudService } from '../fraud/fraud.service';

@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(
    private readonly transactions: TransactionsService,
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly fraud: FraudService,
  ) {}

  /**
   * Map provider charge (webhook) to an internal DEBIT transaction.
   * Ensures idempotency via a deterministic reference composed from provider and providerId.
   */
  async handleProviderCharge(payload: {
    provider: string;
    providerId: string;
    walletOwnerId: string;
    reference: string; // business reference
    amount: number;
    metadata?: any;
  }) {
    const { provider, providerId, walletOwnerId, reference, amount, metadata } = payload;

    // deterministic reference: provider:charge:<providerId>|ref:<reference>
    const txRef = `provider:${provider}:charge:${providerId}|ref:${reference}`;

    // create transaction idempotently
    const tx = await this.transactions.createTransaction({
      walletId: walletOwnerId,
      type: 'DEBIT',
      amount: amount.toString(),
      reference: txRef,
      status: 'PENDING',
      metadata: { provider, providerId, ...metadata },
    });

    this.logger.log(`Mapped provider charge to tx ${tx.id} reference=${txRef}`);

    // Optionally: attach provider metadata to an internal payment record if reference matches
    try {
      if (reference) {
        const payment = await this.prisma.contributionPayment.findFirst({ where: { id: reference } });
        if (payment) {
          await this.prisma.auditLog.create({ data: { actorId: null, action: 'provider_charge_received', entityType: 'ContributionPayment', entityId: payment.id, metadata: { txId: tx.id, provider, providerId } } });
        }
      }
    } catch (err) {
      this.logger.warn('Failed to attach provider metadata', err?.message || err);
    }

    return tx;
  }

  /**
   * Map provider payout confirmation to an internal CREDIT transaction.
   */
  async handleProviderPayout(payload: { provider: string; providerId: string; reference: string; amount: number; metadata?: any }) {
    const { provider, providerId, reference, amount, metadata } = payload;
    const txRef = `provider:${provider}:payout:${providerId}|ref:${reference}`;

    const tx = await this.transactions.createTransaction({
      walletId: undefined as any, // caller should resolve wallet by reference (e.g. payout:<cycleId>)
      type: 'CREDIT',
      amount: amount.toString(),
      reference: txRef,
      status: 'PENDING',
      metadata: { provider, providerId, ref: reference, ...metadata },
    });

    this.logger.log(`Mapped provider payout to tx ${tx.id} reference=${txRef}`);
    return tx;
  }

  /**
   * Confirm a provider charge (settlement) and mark internal transaction SUCCESS and payment PAID atomically.
   */
  async confirmProviderCharge(payload: { provider: string; providerId: string; reference: string; amount?: number; providerStatus?: string }) {
    const { provider, providerId, reference, amount, providerStatus } = payload;
    const txRef = `provider:${provider}:charge:${providerId}|ref:${reference}`;

    // try to find existing transaction by exact reference first
    const existing = await this.transactions.getByReference(txRef);

    // fallback: find by ref:<referefnce> contained in reference
    let txRecord = existing;
    if (!txRecord) {
      txRecord = await this.prisma.transaction.findFirst({ where: { reference: { contains: `ref:${reference}` } } });
    }

    if (!txRecord) {
      this.logger.warn(`No matching transaction found for provider confirmation provider=${provider} providerId=${providerId} ref=${reference}`);
      await this.prisma.auditLog.create({
        data: { actorId: null, action: 'webhook_unmatched', entityType: 'Transaction', entityId: providerId, metadata: { provider, providerId, reference, amount, providerStatus } },
      });
      return { found: false };
    }

    // perform atomic update: mark transaction SUCCESS and mark contribution payment PAID if present
    const res = await this.prisma.$transaction(async (tx) => {
      await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
      const baseMeta = txRecord!.metadata && typeof txRecord!.metadata === 'object' ? txRecord!.metadata : {};
      const newMeta = Object.assign({}, baseMeta, { providerConfirmed: true, providerStatus });
      const updatedTx = await tx.transaction.update({ where: { id: txRecord!.id }, data: { status: 'SUCCESS', metadata: newMeta } });

      // try to parse payment id from reference if present
      let paymentUpdated = null as any;
      const m = txRecord!.reference.match(/\|ref:(.+)$/);
      const paymentId = m ? m[1] : null;
      if (paymentId) {
        const payment = await tx.contributionPayment.findUnique({ where: { id: paymentId } });
        if (payment && payment.status !== 'PAID') {
          paymentUpdated = await tx.contributionPayment.update({ where: { id: paymentId }, data: { status: 'PAID', paidAt: new Date() } });
        }
      }

      await tx.auditLog.create({ data: { actorId: null, action: 'provider_charge_confirmed', entityType: 'Transaction', entityId: updatedTx.id, metadata: { provider, providerId, reference, paymentUpdatedId: paymentUpdated?.id || null } } });

      return { updatedTx, paymentUpdated };
    });

    this.logger.log(`Provider charge confirmed tx=${res.updatedTx.id} paymentUpdated=${!!res.paymentUpdated}`);
    // enqueue notification to payer if paymentUpdated
    try {
      if (res.paymentUpdated) {
        // resolve payment to user
        const p = await this.prisma.contributionPayment.findUnique({ where: { id: res.paymentUpdated.id }, include: { groupContributor: true } });
        const userId = p?.groupContributor?.userId || null;
        if (userId) await this.queue.addNotificationJob('send-notification', { userId, type: 'PAYMENT_SUCCESS', payload: { paymentId: p.id } });
      }
    } catch (err) {
      this.logger.warn('Failed to enqueue payment success notification', err?.message || err);
    }
    // If provider reported a failure and payment was not updated to PAID, run default-rate fraud check
    try {
      if (!res.paymentUpdated && providerStatus && /failed|error|declin/i.test(providerStatus)) {
        const m = txRecord!.reference.match(/\|ref:(.+)$/);
        const paymentId = m ? m[1] : null;
        if (paymentId) {
          const payment = await this.prisma.contributionPayment.findUnique({ where: { id: paymentId }, include: { groupContributor: true } });
          const userId = payment?.groupContributor?.userId || null;
          if (userId) {
            this.fraud.checkDefaultRate(userId).catch((err) => {
              this.logger.warn('Fraud default-rate check failed', err?.message || err);
            });
          }
        }
      }
    } catch (err) {
      this.logger.warn('Failed to run fraud default-rate check', err?.message || err);
    }
    return { ok: true, txId: res.updatedTx.id, paymentUpdated: !!res.paymentUpdated };
  }

  /**
   * Confirm provider transfer (withdraw) and mark matching internal transaction SUCCESS/FAILED.
   */
  async confirmProviderTransfer(payload: { provider: string; providerId: string; reference: string; amount?: number; providerStatus?: string }) {
    const { provider, providerId, reference, amount, providerStatus } = payload;

    // try to find transaction by providerReference in metadata or by reference substring
    let txRecord = await this.prisma.transaction.findFirst({ where: { reference: { contains: reference } } });
    if (!txRecord) {
      // try JSON metadata match (safe when supported)
      try {
        txRecord = await this.prisma.transaction.findFirst({ where: { metadata: { path: ['providerReference'], equals: reference } } as any });
      } catch (_) {
        // ignore if JSON filter not supported
      }
    }

    if (!txRecord) {
      this.logger.warn(`No matching transaction found for provider transfer confirmation provider=${provider} providerId=${providerId} ref=${reference}`);
      return { found: false };
    }

    const res = await this.prisma.$transaction(async (tx) => {
      await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
      const baseMeta = txRecord!.metadata && typeof txRecord!.metadata === 'object' ? txRecord!.metadata : {};
      const newMeta = Object.assign({}, baseMeta, { providerConfirmed: true, providerStatus });
      const status = providerStatus && /success/i.test(providerStatus) ? 'SUCCESS' : (providerStatus && /failed|error/i.test(providerStatus) ? 'FAILED' : 'SUCCESS');
      const updatedTx = await tx.transaction.update({ where: { id: txRecord!.id }, data: { status, metadata: newMeta } });

      await tx.auditLog.create({ data: { actorId: null, action: 'provider_transfer_confirmed', entityType: 'Transaction', entityId: updatedTx.id, metadata: { provider, providerId, reference } } });

      return { updatedTx };
    });

    this.logger.log(`Provider transfer confirmed tx=${res.updatedTx.id}`);
    // notify wallet owner of transfer result
    try {
      const txRec = await this.prisma.transaction.findUnique({ where: { id: res.updatedTx.id } });
      if (txRec && txRec.walletId) {
        const wallet = await this.prisma.wallet.findUnique({ where: { id: txRec.walletId } });
        const userId = wallet?.userId || null;
        if (userId) await this.queue.addNotificationJob('send-notification', { userId, type: /success/i.test(res.updatedTx.status) ? 'PAYOUT_SUCCESS' : 'PAYMENT_FAILED', payload: { txId: res.updatedTx.id } });
      }
    } catch (err) {
      this.logger.warn('Failed to enqueue provider transfer notification', err?.message || err);
    }
    return { ok: true, txId: res.updatedTx.id };
  }

  /**
   * Handle a provider deposit (eg. Paystack virtual-account incoming payment) and map to a CREDIT transaction
   */
  async handleProviderDeposit(payload: { provider: string; providerId: string; reference?: string; amount: number; metadata?: any }) {
    const { provider, providerId, reference, amount, metadata } = payload;
    const txRef = `provider:${provider}:deposit:${providerId}|ref:${reference || ''}`;

    // try to resolve wallet by provider-specific identifiers in metadata
    let wallet = null as any;
    try {
      const vaId = metadata?.virtualAccountId || metadata?.virtual_account?.id || metadata?.recipient || metadata?.recipient_code || null;
      const acct = metadata?.accountNumber || metadata?.account_number || metadata?.virtual_account?.account_number || null;
      if (vaId) {
        wallet = await this.prisma.wallet.findFirst({ where: { paystackVirtualAccountId: vaId } });
      }
      if (!wallet && acct) {
        wallet = await this.prisma.wallet.findFirst({ where: { paystackAccountNumber: acct } });
      }
    } catch (err) {
      this.logger.warn('Error resolving wallet for provider deposit', err?.message || err);
    }

    if (!wallet) {
      this.logger.warn(`No wallet found for deposit provider=${provider} providerId=${providerId} ref=${reference}`);
      return { found: false };
    }

    // create credit transaction idempotently
    const tx = await this.transactions.createTransaction({
      walletId: wallet.id,
      type: 'CREDIT',
      amount: (amount ?? 0).toString(),
      reference: txRef,
      status: 'SUCCESS',
      metadata: Object.assign({}, metadata ?? {}, { provider, providerId, reference }),
    });

    // audit and notify wallet owner
    try {
      await this.prisma.auditLog.create({ data: { actorId: null, action: 'provider_deposit_received', entityType: 'Transaction', entityId: tx.id, metadata: { provider, providerId, walletId: wallet.id, reference } } });
      const userId = wallet.userId || null;
      if (userId) await this.queue.addNotificationJob('send-notification', { userId, type: 'WALLET_CREDIT', payload: { txId: tx.id, amount } });
    } catch (err) {
      this.logger.warn('Failed to audit/notify provider deposit', err?.message || err);
    }

    this.logger.log(`Mapped provider deposit to tx ${tx.id} wallet=${wallet.id} reference=${txRef}`);
    return tx;
  }
}
