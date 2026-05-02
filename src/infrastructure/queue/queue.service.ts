import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Queue, Worker, Job, QueueScheduler } from 'bullmq';
import * as Sentry from '@sentry/node';
import { NotificationsProcessorService } from './notifications-processor.service';
import { PaymentsProcessorService } from './payments-processor.service';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);

  private redisConnection: Redis;
  public paymentsQueue: Queue;
  public payoutsQueue: Queue;
  public notificationsQueue: Queue;
  public reconciliationQueue: Queue;

  private paymentsWorker: Worker;
  private payoutsWorker: Worker;
  private notificationsWorker: Worker;

  // QueueSchedulers are required in BullMQ v1 to promote delayed jobs to active.
  // Without them, delayed jobs sit in Redis forever and never fire.
  private paymentsScheduler: QueueScheduler;
  private payoutsScheduler: QueueScheduler;
  private notificationsScheduler: QueueScheduler;
  private reconciliationScheduler: QueueScheduler;

  constructor(
    private readonly config: ConfigService,
    private readonly notificationsProcessor: NotificationsProcessorService,
    private readonly paymentsProcessor: PaymentsProcessorService,
  ) {}

  async onModuleInit() {
    const disableInApp = process.env.DISABLE_IN_APP_WORKERS === 'true';
    const host = this.config.get<string>('REDIS_HOST', '127.0.0.1');
    const port = parseInt(this.config.get<string>('REDIS_PORT', '6379'), 10);
    const db = parseInt(this.config.get<string>('REDIS_DB', '0'), 10);

    this.redisConnection = new Redis({ host, port, db, lazyConnect: false });
    // Attach error listener so Node.js does NOT crash on Redis connection errors.
    // Without this, ioredis emits an 'error' event with no listener → process exit.
    this.redisConnection.on('error', (err: any) => {
      this.logger.error(`Queue Redis error: ${err?.message ?? err}`);
    });
    this.redisConnection.on('reconnecting', () => {
      this.logger.warn('Queue Redis reconnecting...');
    });

    // Pass the shared ioredis instance to BullMQ so it reuses the same connection
    // (with the error listener above) rather than creating bare unguarded ones.
    const connection = this.redisConnection;

    this.paymentsQueue = new Queue('payments', { connection });
    this.payoutsQueue = new Queue('payouts', { connection });
    this.notificationsQueue = new Queue('notifications', { connection });
    this.reconciliationQueue = new Queue('reconciliation', { connection });

    // QueueSchedulers must be created for every queue that uses delayed jobs (including retries
    // and repeatable jobs). In BullMQ v1 the Worker does NOT promote delayed jobs by itself —
    // the QueueScheduler is the dedicated process responsible for that.
    const schedulerConn = { host, port, db };
    this.paymentsScheduler = new QueueScheduler('payments', { connection: schedulerConn });
    this.payoutsScheduler = new QueueScheduler('payouts', { connection: schedulerConn });
    this.notificationsScheduler = new QueueScheduler('notifications', { connection: schedulerConn });
    this.reconciliationScheduler = new QueueScheduler('reconciliation', { connection: schedulerConn });

    // BullMQ Queue instances emit 'error' events from their internal connections.
    // Attach listeners to prevent unhandled error crashes.
    for (const [name, q] of [['payments', this.paymentsQueue], ['payouts', this.payoutsQueue], ['notifications', this.notificationsQueue], ['reconciliation', this.reconciliationQueue]] as const) {
      q.on('error', (err: any) => {
        this.logger.error(`Queue [${name}] error: ${err?.message ?? err}`);
      });
    }

    if (!disableInApp) {
      this.paymentsWorker = new Worker(
        'payments',
        async (job: Job) => {
          return this.paymentsProcessor.process(job, {
            payments: this.paymentsQueue,
            payouts: this.payoutsQueue,
            notifications: this.notificationsQueue,
          });
        },
        {
          connection,
          concurrency: 1,
        },
      );
      this.paymentsWorker.on('error', (err: any) => {
        this.logger.error(`Payments worker error: ${err?.message ?? err}`);
      });
    } else {
      this.logger.log('In-app payments worker disabled (DISABLE_IN_APP_WORKERS=true)');
    }

      // payouts are processed by a dedicated worker process (see src/worker/payouts.worker.ts)
      this.logger.log('Payouts worker delegated to external worker process');

    if (!disableInApp) {
      this.notificationsWorker = new Worker(
        'notifications',
        async (job: Job) => {
          const reqId = job.data?.__meta?.requestId || job.data?.requestId || job.data?.meta?.requestId || null;
          if (process.env.SENTRY_DSN && reqId) {
            try {
              Sentry.addBreadcrumb({ category: 'job', message: `notifications job ${job.id}`, data: { requestId: reqId } });
            } catch (err) {}
          }
          return this.notificationsProcessor.process(job);
        },
        {
          connection,
          concurrency: 10,
        },
      );
      this.notificationsWorker.on('error', (err: any) => {
        this.logger.error(`Notifications worker error: ${err?.message ?? err}`);
      });
    } else {
      this.logger.log('In-app notifications worker disabled (DISABLE_IN_APP_WORKERS=true)');
    }

    // Purge any accumulated repeatable schedules AND orphaned delayed job instances from previous restarts
    try {
      const cronJobNames = new Set(['reconcile-paystack', 'apply-late-fees', 'reprovision-wallets']);

      // 1. Remove repeatable schedule entries
      const existingRepeatables = await this.notificationsQueue.getRepeatableJobs();
      for (const r of existingRepeatables) {
        if (cronJobNames.has(r.name)) {
          await this.notificationsQueue.removeRepeatableByKey(r.key);
        }
      }

      // 2. Remove any orphaned delayed job instances left behind from prior restarts
      const delayedJobs = await this.notificationsQueue.getDelayed();
      for (const job of delayedJobs) {
        if (cronJobNames.has(job.name)) {
          await job.remove();
        }
      }

      // Also clean up reconciliation queue repeatables
      const reconRepeatables = await this.reconciliationQueue.getRepeatableJobs();
      for (const r of reconRepeatables) {
        await this.reconciliationQueue.removeRepeatableByKey(r.key);
      }
      const reconDelayed = await this.reconciliationQueue.getDelayed();
      for (const job of reconDelayed) {
        await job.remove();
      }
    } catch (err) {
      this.logger.warn('Failed to clean up repeatable jobs', err?.message || err);
    }

    // schedule a periodic reconciliation job (runs every 5 minutes by default)
    try {
      const cron = process.env.RECONCILE_CRON || '*/5 * * * *';
      await this.reconciliationQueue.add('reconcile-paystack', {}, { repeat: { cron }, removeOnComplete: true });
      this.logger.log(`Scheduled reconcile-paystack job cron=${cron}`);
    } catch (err) {
      this.logger.warn('Failed to schedule reconcile job', err?.message || err);
    }

    // schedule late-fee application job (daily by default)
    try {
      const lateCron = process.env.LATEFEE_CRON || '0 0 * * *';
      await this.notificationsQueue.add('apply-late-fees', {}, { repeat: { cron: lateCron }, removeOnComplete: true });
      this.logger.log(`Scheduled apply-late-fees job cron=${lateCron}`);
    } catch (err) {
      this.logger.warn('Failed to schedule late-fee job', err?.message || err);
    }

    // schedule invitation expiry sweep (daily at 00:30 by default)
    try {
      const expireCron = process.env.INVITATION_EXPIRE_CRON || '30 0 * * *';
      await this.notificationsQueue.add('expire-invitations', {}, { repeat: { cron: expireCron }, removeOnComplete: true });
      this.logger.log(`Scheduled expire-invitations job cron=${expireCron}`);
    } catch (err) {
      this.logger.warn('Failed to schedule expire-invitations job', err?.message || err);
    }

    // schedule cycle timeout sweep (daily at 01:00 by default)
    try {
      const timeoutCron = process.env.CYCLE_TIMEOUT_CRON || '0 1 * * *';
      await this.notificationsQueue.add('cycle-timeout-sweep', {}, { repeat: { cron: timeoutCron }, removeOnComplete: true });
      this.logger.log(`Scheduled cycle-timeout-sweep job cron=${timeoutCron}`);
    } catch (err) {
      this.logger.warn('Failed to schedule cycle-timeout-sweep job', err?.message || err);
    }

    // schedule wallet re-provisioning sweep (every 30 minutes by default)
    try {
      const reprovisionCron = process.env.REPROVISION_CRON || '*/30 * * * *';
      await this.notificationsQueue.add('reprovision-wallets', {}, { repeat: { cron: reprovisionCron }, removeOnComplete: true });
      this.logger.log(`Scheduled reprovision-wallets sweep cron=${reprovisionCron}`);
    } catch (err) {
      this.logger.warn('Failed to schedule reprovision-wallets job', err?.message || err);
    }

    [this.paymentsWorker, this.payoutsWorker, this.notificationsWorker]
      .filter((w) => !!w)
      .forEach((w) => {
        w.on('failed', (job, err) => {
          this.logger.error(`Job ${job.id} failed: ${err?.message || err}`);
        });
        w.on('completed', (job) => {
          this.logger.log(`Job ${job.id} completed`);
        });
      });

    this.logger.log('BullMQ queues & workers initialized');
  }

  async addPaymentJob(name: string, data: any, opts: any = {}) {
    const defaultOpts = {
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false,
      ...opts,
    };
    // attach requestId meta if present in data
    const meta = data?.__meta || data?.meta || {};
    const requestId = meta.requestId || data?.requestId || null;
    const jobData = { ...data, __meta: { ...meta, requestId } };
    return this.paymentsQueue.add(name, jobData, defaultOpts);
  }

  async scheduleAutoDebit(cycle: { id: string; contributionDate: string | Date }) {
    const contributionDate = typeof cycle.contributionDate === 'string' ? new Date(cycle.contributionDate) : cycle.contributionDate;
    const now = new Date();
    let delay = contributionDate.getTime() - now.getTime();
    if (delay < 0) delay = 0;
    // ensure jobId equals cycle.id to avoid duplicates
    return this.paymentsQueue.add('auto-debit-cycle', { cycleId: cycle.id }, { jobId: cycle.id, delay, attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: { count: 50 }, removeOnFail: false });
  }

  async cancelScheduledPayment(jobId: string): Promise<boolean> {
    try {
      const job = await this.paymentsQueue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Cancelled scheduled payment job ${jobId}`);
        return true;
      }
      return false;
    } catch (err: any) {
      this.logger.warn(`Could not cancel payment job ${jobId}: ${err?.message}`);
      return false;
    }
  }

  async addPayoutJob(name: string, data: any, opts: any = {}) {
    const defaultOpts = {
      attempts: 5,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
      removeOnComplete: { age: 60 * 60 },
      ...opts,
    };
    const meta = data?.__meta || data?.meta || {};
    const requestId = meta.requestId || data?.requestId || null;
    const jobData = { ...data, __meta: { ...meta, requestId } };
    return this.payoutsQueue.add(name, jobData, defaultOpts);
  }

  async addNotificationJob(name: string, data: any, opts: any = {}) {
    const defaultOpts = {
      attempts: 3,
      backoff: {
        type: 'fixed' as const,
        delay: 500,
      },
      removeOnComplete: { age: 60 * 60 },
      ...opts,
    };
    const meta = data?.__meta || data?.meta || {};
    const requestId = meta.requestId || data?.requestId || null;
    const jobData = { ...data, __meta: { ...meta, requestId } };
    return this.notificationsQueue.add(name, jobData, defaultOpts);
  }

  async triggerReconciliation() {
    return this.reconciliationQueue.add('reconcile-paystack', { triggeredAt: new Date().toISOString() }, { removeOnComplete: true, attempts: 1 });
  }

  async onModuleDestroy() {
    try {
      await Promise.all([
        this.paymentsScheduler?.close(),
        this.payoutsScheduler?.close(),
        this.notificationsScheduler?.close(),
        this.reconciliationScheduler?.close(),
        this.paymentsWorker?.close(),
        this.payoutsWorker?.close(),
        this.notificationsWorker?.close(),
        this.paymentsQueue?.close(),
        this.payoutsQueue?.close(),
        this.notificationsQueue?.close(),
        this.reconciliationQueue?.close(),
        this.redisConnection?.quit(),
      ]);
      this.logger.log('BullMQ queues & workers shut down');
    } catch (err) {
      this.logger.error('Error shutting down queues', err);
    }
  }
}
