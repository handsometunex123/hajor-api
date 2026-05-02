import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurgeService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  onModuleInit() {
    const days = parseInt(this.config.get<string>('SOFT_DELETE_RETENTION_DAYS', '90'), 10);
    const intervalMs = 24 * 60 * 60 * 1000; // run daily
    // run once on startup
    this.runPurge(days).catch((err) => console.error('Initial purge failed', err));
    // schedule daily
    setInterval(() => this.runPurge(days).catch((err) => console.error('Scheduled purge failed', err)), intervalMs);
  }

  private async runPurge(days: number) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Prefer model-based deletes for safety and parameterization.
    // Order deletes to avoid FK constraint violations where possible.
    const ops: { name: string; fn: () => Promise<any> }[] = [
      { name: 'ContributionPayment', fn: () => this.prisma.contributionPayment.deleteMany({ where: { deletedAt: { lt: cutoff } } }) },
      { name: 'Transaction', fn: async () => this.prisma.$transaction(async (tx) => {
        await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
        return tx.transaction.deleteMany({ where: { deletedAt: { lt: cutoff } } });
      }) },
      { name: 'AuditLog', fn: () => this.prisma.auditLog.deleteMany({ where: { deletedAt: { lt: cutoff } } }) },
      { name: 'ContributionCycle', fn: () => this.prisma.contributionCycle.deleteMany({ where: { deletedAt: { lt: cutoff } } }) },
      { name: 'GroupContributor', fn: () => this.prisma.groupContributor.deleteMany({ where: { deletedAt: { lt: cutoff } } }) },
      { name: 'Dispute', fn: () => this.prisma.dispute.deleteMany({ where: { deletedAt: { lt: cutoff } } }) },
      { name: 'Wallet', fn: async () => this.prisma.$transaction(async (tx) => {
        await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
        return tx.wallet.deleteMany({ where: { deletedAt: { lt: cutoff } } });
      }) },
      { name: 'Group', fn: () => this.prisma.group.deleteMany({ where: { deletedAt: { lt: cutoff } } }) },
      { name: 'User', fn: () => this.prisma.user.deleteMany({ where: { deletedAt: { lt: cutoff } } }) },
    ];

    for (const op of ops) {
      try {
        const result = await op.fn();
        // eslint-disable-next-line no-console
        console.info(`Purged ${result.count ?? result} rows from ${op.name}`);
      } catch (err) {
        // log and continue; some deletes may fail due to FK ordering — keep raw fallback as last resort
        // eslint-disable-next-line no-console
        console.error(`Purge failed for ${op.name}:`, err?.message || err);
      }
    }
  }
}
