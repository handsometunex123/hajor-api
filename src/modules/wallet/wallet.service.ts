import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Compute current wallet balance derived from SUCCESS transactions.
   * Returns string representation to preserve precision.
   */
  async getBalance(walletId: string): Promise<string> {
    const credit = await this.prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { walletId, type: 'CREDIT', status: 'SUCCESS' },
    });

    const debit = await this.prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { walletId, type: 'DEBIT', status: 'SUCCESS' },
    });

    const creditSum = credit._sum.amount ? credit._sum.amount.toString() : '0';
    const debitSum = debit._sum.amount ? debit._sum.amount.toString() : '0';

    // Use Decimal arithmetic if available in runtime, else fallback to string-based subtraction
    try {
      const result = new Prisma.Decimal(creditSum).minus(new Prisma.Decimal(debitSum));
      return result.toFixed(2);
    } catch (err) {
      // naive fallback
      const c = parseFloat(creditSum);
      const d = parseFloat(debitSum);
      return (Number.isNaN(c) || Number.isNaN(d) ? 0 : c - d).toFixed(2);
    }
  }

  async getWalletByUser(userId: string) {
    return this.prisma.wallet.findUnique({ where: { userId } });
  }

  async getWalletByGroup(groupId: string) {
    return this.prisma.wallet.findUnique({ where: { groupId } });
  }

  async getTransactions(walletId: string, opts: { page?: number; limit?: number; type?: string; status?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const allowedSortFields = ['createdAt', 'amount', 'type', 'status'];
    const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: any = { walletId };
    if (opts.type) where.type = opts.type;
    if (opts.status) where.status = opts.status;

    const [txs, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: { id: true, type: true, amount: true, reference: true, status: true, metadata: true, createdAt: true },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    // normalize amounts to string to preserve precision across JSON
    const data = txs.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount ? t.amount.toString() : '0',
      reference: t.reference,
      status: t.status,
      metadata: t.metadata,
      createdAt: t.createdAt,
    }));

    return {
      items: data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async listNonProvisioned(opts: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 200) : 50;
    const skip = (page - 1) * limit;

    // Safe sorting with allowlisted fields
    const allowedSortFields = ['createdAt'];
    const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';

    const [rows, total] = await Promise.all([
      this.prisma.wallet.findMany({ where: { OR: [{ paystackProvisionStatus: null }, { paystackProvisionStatus: { not: 'PROVISIONED' } }] }, include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.wallet.count({ where: { OR: [{ paystackProvisionStatus: null }, { paystackProvisionStatus: { not: 'PROVISIONED' } }] } }),
    ]);

    const data = rows.map((w) => ({ id: w.id, userId: w.userId, provisionStatus: w.paystackProvisionStatus, attempts: (w as any).paystackProvisionAttempts || 0, provisionedAt: (w as any).paystackProvisionedAt || null, user: w.user }));
    return { items: data, pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async triggerProvision(walletId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId }, include: { user: true } as any });
    if (!wallet) throw new Error('Wallet not found');

    const user = (wallet as any).user as any;
    const name = user ? `${user.firstName} ${user.lastName}` : undefined;
    const email = user?.email || undefined;

    await this.queueService.addNotificationJob('provision-virtual-account', { walletId: wallet.id, name, email }, { attempts: 10, backoff: { type: 'exponential', delay: 3000 }, removeOnFail: false });
    return { ok: true, walletId: wallet.id };
  }

  /**
   * DEV ONLY — instantly marks every un-provisioned wallet as PROVISIONED
   * with dummy data, bypassing Paystack entirely.
   * Throws if called in production.
   */
  async devProvisionAll(): Promise<{ provisioned: number; walletIds: string[] }> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('devProvisionAll is not available in production');
    }

    const fakeBanks = ['Wema Bank', 'Sterling Bank', 'Providus Bank', 'Titan Trust Bank'];

    const stuck = await this.prisma.wallet.findMany({
      where: { OR: [{ paystackProvisionStatus: null }, { paystackProvisionStatus: { not: 'PROVISIONED' } }] },
      select: { id: true },
    });

    const walletIds: string[] = [];
    for (const w of stuck) {
      const fakeAccountNumber = String(Math.floor(1000000000 + Math.random() * 9000000000));
      const fakeBank = fakeBanks[Math.floor(Math.random() * fakeBanks.length)];
      await this.prisma.$transaction(async (tx) => {
        await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
        await (tx.wallet as any).update({
          where: { id: w.id },
          data: {
            paystackVirtualAccountId: `dev_va_${Date.now()}_${w.id.slice(0, 8)}`,
            paystackAccountNumber: fakeAccountNumber,
            paystackBank: fakeBank,
            paystackMeta: { dev: true, account_number: fakeAccountNumber, bank: fakeBank },
            paystackProvisionStatus: 'PROVISIONED',
            paystackProvisionedAt: new Date(),
          },
        });
      });
      walletIds.push(w.id);
    }

    return { provisioned: walletIds.length, walletIds };
  }

  /**
   * DEV ONLY — directly credits a user's wallet by inserting a SUCCESS CREDIT transaction.
   * Bypasses Paystack entirely. Use to seed test balances on dev.
   */
  async devFundWallet(userId: string, amount: number): Promise<{ walletId: string; credited: number; newBalance: string }> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('devFundWallet is not available in production');
    }
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error(`No wallet found for userId ${userId}`);

    await this.prisma.$transaction(async (tx) => {
      await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
      await (tx.transaction as any).create({
        data: {
          walletId:  wallet.id,
          type:      'CREDIT',
          amount:    amount,
          reference: `dev-fund:${wallet.id}:${Date.now()}`,
          status:    'SUCCESS',
          metadata:  { source: 'dev-fund' },
        },
      });
    });

    const newBalance = await this.getBalance(wallet.id);
    return { walletId: wallet.id, credited: amount, newBalance };
  }
}
