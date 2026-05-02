import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { sendAlert } from '../monitoring/alert';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    const pool = process.env.DB_POOL || process.env.PRISMA_POOL || 'default';
    // Log pool config for visibility; set pool via DATABASE_URL parameters in production
    // e.g. postgres://user:pass@host:port/db?connection_limit=10
    // Prisma itself uses the underlying driver pool settings from the connection string.
    // We still connect here and rely on DATABASE_URL for pooling configuration.
    // NOTE: tune `connection_limit` in DATABASE_URL for production.
    // Connect – wrap in try/catch so the app does not crash when DB is unreachable on startup.
    // Queries will fail gracefully until the DB comes back; /health will report the outage.
    try {
      await this.$connect();
      // eslint-disable-next-line no-console
      console.info(`Prisma connected (pool=${pool})`);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(`Prisma connection failed (pool=${pool}): ${err?.message ?? err}. App will keep running and retry on first query.`);
    }

    // Prisma middleware to automatically exclude soft-deleted records (deletedAt != null)
    // Use `includeDeleted: true` in query args to bypass the filter when necessary.
    this.$use(async (params, next) => {
      // Guard: prevent direct writes to sensitive tables (Transaction, Wallet) unless
      // caller explicitly sets `params.args._internal = true` when invoking the client.
      // This enforces use of `TransactionsService.createTransaction()` and related
      // internal APIs which handle idempotency and auditing.
      const guardedModels = ['Transaction', 'Wallet'];
      const writeActions = ['create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany'];
      try {
        if (params.model && guardedModels.includes(params.model) && writeActions.includes(params.action)) {
          const isInternal = params.args && Object.prototype.hasOwnProperty.call(params.args, '_internal') && params.args._internal === true;
          if (!isInternal) {
            // Alert that an application code path attempted a forbidden write
            try {
              await sendAlert('Forbidden DB write attempt', { model: params.model, action: params.action });
            } catch (_) {}
            throw new Error(`Direct writes to ${params.model} are forbidden. Use internal service APIs.`);
          }
          // remove the flag so Prisma doesn't attempt to use it as part of the query
          try { delete params.args._internal; } catch (_) {}
        }

        // Only apply soft-delete filter to models that actually have a deletedAt field
        const softDeleteModels = new Set([
          'User', 'Wallet', 'Transaction', 'Group', 'GroupContributor',
          'ContributionCycle', 'ContributionPayment', 'Dispute', 'AuditLog',
        ]);
        const actionsToFilter = ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate'];
        if (!params.model || !actionsToFilter.includes(params.action) || !softDeleteModels.has(params.model)) {
          return await next(params);
        }

        // allow opt-out
        if (params.args && params.args.includeDeleted) {
          delete params.args.includeDeleted;
          return await next(params);
        }

        params.args = params.args || {};

        // transform findUnique into findFirst so we can add a deletedAt filter
        if (params.action === 'findUnique') {
          params.action = 'findFirst';
        }

        // add deletedAt IS NULL to where clause
        if (params.args.where) {
          // if caller already filters deletedAt explicitly, do not override
          const where = params.args.where as any;
          if (!Object.prototype.hasOwnProperty.call(where, 'deletedAt')) {
            params.args.where = { AND: [where, { deletedAt: null }] };
          }
        } else {
          params.args.where = { deletedAt: null };
        }

        return await next(params);
      } catch (err) {
        // If the DB trigger raised an error indicating the accounting guard, alert and rethrow
        const msg = err?.message || '';
        if (msg.includes('Direct writes to guarded table') || msg.includes('Direct writes to')) {
          try {
            await sendAlert('DB Guard triggered: forbidden write', { model: params.model, action: params.action, error: msg });
          } catch (_) {}
        }
        throw err;
      }
    });
  }

  async enableShutdownHooks(app: any) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
