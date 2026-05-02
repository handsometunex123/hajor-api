import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { PaystackService } from '../../infrastructure/paystack/paystack.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class WithdrawService {
  private readonly logger = new Logger(WithdrawService.name);

  private readonly OTP_THRESHOLD = Number(process.env.WITHDRAW_OTP_THRESHOLD || '50000');
  private readonly MAX_SINGLE = Number(process.env.WITHDRAW_MAX_SINGLE || '1000000');
  private readonly DAILY_LIMIT = Number(process.env.WITHDRAW_DAILY_LIMIT || '5000000');

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionsService,
    private readonly paystack: PaystackService,
    private readonly queue: QueueService,
    private readonly usersService: UsersService,
  ) {}

  async requestWithdraw(userId: string, amount: number, recipient: string, transactionPin: string, note?: string) {
    const pinValid = await this.usersService.verifyTransactionPin(userId, transactionPin);
    if (!pinValid) throw new BadRequestException('Invalid transaction PIN');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found for user');

    if (amount <= 0) throw new BadRequestException('Invalid withdraw amount');
    if (amount > this.MAX_SINGLE) throw new BadRequestException('Amount exceeds single-withdraw limit');

    // compute available balance = SUCCESS credits - SUCCESS debits - PENDING debits
    const creditAgg = await this.prisma.transaction.aggregate({ where: { walletId: wallet.id, type: 'CREDIT', status: 'SUCCESS' }, _sum: { amount: true } as any });
    const debitAgg = await this.prisma.transaction.aggregate({ where: { walletId: wallet.id, type: 'DEBIT', status: 'SUCCESS' }, _sum: { amount: true } as any });
    const pendingDebitAgg = await this.prisma.transaction.aggregate({ where: { walletId: wallet.id, type: 'DEBIT', status: 'PENDING' }, _sum: { amount: true } as any });

    const credits = Number(creditAgg._sum?.amount ?? 0);
    const debits = Number(debitAgg._sum?.amount ?? 0);
    const pendingDebits = Number(pendingDebitAgg._sum?.amount ?? 0);

    const available = credits - debits - pendingDebits;
    if (available < amount) throw new BadRequestException('Insufficient available balance');

    // check daily limit (sum of today's successful + pending debits)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayAgg = await this.prisma.transaction.aggregate({ where: { walletId: wallet.id, type: 'DEBIT', createdAt: { gte: startOfDay } as any, status: { in: ['SUCCESS', 'PENDING'] } }, _sum: { amount: true } as any });
    const todayTotal = Number(todayAgg._sum?.amount ?? 0);
    if (todayTotal + amount > this.DAILY_LIMIT) throw new BadRequestException('Daily withdraw limit exceeded');

    // deterministic-ish reference for idempotency; include timestamp to avoid collisions
    const reference = `withdraw:${wallet.userId}:${Date.now()}`;

    // if amount exceeds OTP threshold, generate OTP and require confirmation before calling provider
    const needsOtp = amount >= this.OTP_THRESHOLD;
    const otp = needsOtp ? Math.floor(100000 + Math.random() * 900000).toString() : undefined;
    const otpExpiresAt = needsOtp ? new Date(Date.now() + 5 * 60 * 1000) : undefined; // 5 minutes

    // create a PENDING debit transaction (idempotent). If awaiting OTP, store otp in metadata and leave provider call for confirm step.
    const metadata: import('../../common/types/json').JsonObject = { recipient, note, requestedBy: userId };
    if (needsOtp) metadata.awaitingOtp = true;
    if (needsOtp && otp) metadata.otpHash = await bcrypt.hash(otp, 10);
    if (needsOtp && otpExpiresAt) metadata.otpExpiresAt = otpExpiresAt.toISOString();

    const tx = await this.transactions.createTransaction({
      walletId: wallet.id,
      type: 'DEBIT',
      amount: amount.toString(),
      reference,
      status: 'PENDING',
      metadata,
    });

    // If OTP required, return instruction and do not call provider yet
    if (needsOtp) {
      // TODO: send OTP via notification channel (email/SMS) — enqueue notification
      try {
        await this.queue.addNotificationJob('send-otp', {
          userId,
          txId: tx.id,
          otp,
        });
      } catch (err) {
        this.logger.warn('Failed to enqueue OTP notification', err?.message || err);
      }

      return { txId: tx.id, status: 'AWAITING_OTP', needsOtp: true };
    }

    // initiate provider transfer (Paystack)
    try {
      const providerRef = `withdraw:tx:${tx.id}`;
      const res = await this.paystack.initiateTransfer({ recipient, amount, reference: providerRef, reason: note ?? `User withdraw ${userId}` });

      // persist provider reference into transaction metadata
      try {
        const oldMeta = (tx.metadata || {}) as Record<string, unknown>;
        await this.prisma.$transaction(async (client) => {
          await (client as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
          await (client.transaction as any).update({ where: { id: tx.id }, data: { metadata: { ...oldMeta, providerReference: res.data?.reference ?? res.data?.id ?? providerRef, providerResponse: res } } });
        });
      } catch (err) {
        this.logger.warn('Failed to update transaction with provider reference', err?.message || err);
      }

      return { txId: tx.id, provider_reference: res.data?.reference ?? res.data?.id ?? providerRef, status: 'PENDING' };
    } catch (err) {
      this.logger.warn('Provider transfer initiation failed', err?.message || err);
      // leave transaction as PENDING for manual retry / reconciliation
      return { txId: tx.id, status: 'PENDING', error: 'Transfer initiation failed' };
    }
  }

  async confirmWithdraw(userId: string, txId: string, otp?: string) {
    const tx = await this.prisma.transaction.findUnique({ where: { id: txId } });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (!tx.walletId) throw new BadRequestException('Transaction not associated with wallet');

    const wallet = await this.prisma.wallet.findUnique({ where: { id: tx.walletId } });
    if (!wallet || wallet.userId !== userId) throw new BadRequestException('Unauthorized');

    const meta: any = tx.metadata || {};
    if (!meta.awaitingOtp) throw new BadRequestException('Transaction does not require confirmation');
    if (!meta.otpHash) throw new BadRequestException('OTP not found for transaction');
    if (!otp) throw new BadRequestException('OTP required');
    if (!await bcrypt.compare(otp, meta.otpHash)) throw new BadRequestException('Invalid OTP');
    if (meta.otpExpiresAt && new Date(meta.otpExpiresAt) < new Date()) throw new BadRequestException('OTP expired');

    // clear awaitingOtp flag and initiate transfer
    try {
      const providerRef = `withdraw:tx:${tx.id}`;
      const amt = typeof tx.amount === 'string' ? Number(tx.amount) : Number(tx.amount.toString());
      const res = await this.paystack.initiateTransfer({ recipient: meta.recipient, amount: amt, reference: providerRef, reason: meta.note ?? `User withdraw ${userId}` });

      const newMeta = { ...meta, awaitingOtp: false, otpHash: undefined, otpExpiresAt: undefined, providerReference: res.data?.reference ?? res.data?.id ?? providerRef, providerResponse: res };
      await this.prisma.$transaction(async (client) => {
        await (client as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
        await (client.transaction as any).update({ where: { id: tx.id }, data: { metadata: newMeta } });
      });

      return { txId: tx.id, provider_reference: newMeta.providerReference, status: 'PENDING' };
    } catch (err) {
      this.logger.warn('Provider transfer initiation failed', err?.message || err);
      return { txId: tx.id, status: 'PENDING', error: 'Transfer initiation failed' };
    }
  }
}
