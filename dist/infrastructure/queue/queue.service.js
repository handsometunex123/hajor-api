"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var QueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const bullmq_1 = require("bullmq");
const Sentry = __importStar(require("@sentry/node"));
const notifications_processor_service_1 = require("./notifications-processor.service");
const payments_processor_service_1 = require("./payments-processor.service");
let QueueService = QueueService_1 = class QueueService {
    constructor(config, notificationsProcessor, paymentsProcessor) {
        this.config = config;
        this.notificationsProcessor = notificationsProcessor;
        this.paymentsProcessor = paymentsProcessor;
        this.logger = new common_1.Logger(QueueService_1.name);
    }
    async onModuleInit() {
        const disableInApp = process.env.DISABLE_IN_APP_WORKERS === 'true';
        const host = this.config.get('REDIS_HOST', '127.0.0.1');
        const port = parseInt(this.config.get('REDIS_PORT', '6379'), 10);
        const db = parseInt(this.config.get('REDIS_DB', '0'), 10);
        this.redisConnection = new ioredis_1.default({ host, port, db, lazyConnect: false });
        this.redisConnection.on('error', (err) => {
            var _a;
            this.logger.error(`Queue Redis error: ${(_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err}`);
        });
        this.redisConnection.on('reconnecting', () => {
            this.logger.warn('Queue Redis reconnecting...');
        });
        const connection = this.redisConnection;
        this.paymentsQueue = new bullmq_1.Queue('payments', { connection });
        this.payoutsQueue = new bullmq_1.Queue('payouts', { connection });
        this.notificationsQueue = new bullmq_1.Queue('notifications', { connection });
        this.reconciliationQueue = new bullmq_1.Queue('reconciliation', { connection });
        const schedulerConn = { host, port, db };
        this.paymentsScheduler = new bullmq_1.QueueScheduler('payments', { connection: schedulerConn });
        this.payoutsScheduler = new bullmq_1.QueueScheduler('payouts', { connection: schedulerConn });
        this.notificationsScheduler = new bullmq_1.QueueScheduler('notifications', { connection: schedulerConn });
        this.reconciliationScheduler = new bullmq_1.QueueScheduler('reconciliation', { connection: schedulerConn });
        for (const [name, q] of [['payments', this.paymentsQueue], ['payouts', this.payoutsQueue], ['notifications', this.notificationsQueue], ['reconciliation', this.reconciliationQueue]]) {
            q.on('error', (err) => {
                var _a;
                this.logger.error(`Queue [${name}] error: ${(_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err}`);
            });
        }
        if (!disableInApp) {
            this.paymentsWorker = new bullmq_1.Worker('payments', async (job) => {
                return this.paymentsProcessor.process(job, {
                    payments: this.paymentsQueue,
                    payouts: this.payoutsQueue,
                    notifications: this.notificationsQueue,
                });
            }, {
                connection,
                concurrency: 1,
            });
            this.paymentsWorker.on('error', (err) => {
                var _a;
                this.logger.error(`Payments worker error: ${(_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err}`);
            });
        }
        else {
            this.logger.log('In-app payments worker disabled (DISABLE_IN_APP_WORKERS=true)');
        }
        this.logger.log('Payouts worker delegated to external worker process');
        if (!disableInApp) {
            this.notificationsWorker = new bullmq_1.Worker('notifications', async (job) => {
                var _a, _b, _c, _d, _e;
                const reqId = ((_b = (_a = job.data) === null || _a === void 0 ? void 0 : _a.__meta) === null || _b === void 0 ? void 0 : _b.requestId) || ((_c = job.data) === null || _c === void 0 ? void 0 : _c.requestId) || ((_e = (_d = job.data) === null || _d === void 0 ? void 0 : _d.meta) === null || _e === void 0 ? void 0 : _e.requestId) || null;
                if (process.env.SENTRY_DSN && reqId) {
                    try {
                        Sentry.addBreadcrumb({ category: 'job', message: `notifications job ${job.id}`, data: { requestId: reqId } });
                    }
                    catch (err) { }
                }
                return this.notificationsProcessor.process(job);
            }, {
                connection,
                concurrency: 10,
            });
            this.notificationsWorker.on('error', (err) => {
                var _a;
                this.logger.error(`Notifications worker error: ${(_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err}`);
            });
        }
        else {
            this.logger.log('In-app notifications worker disabled (DISABLE_IN_APP_WORKERS=true)');
        }
        try {
            const cronJobNames = new Set(['reconcile-paystack', 'apply-late-fees', 'reprovision-wallets']);
            const existingRepeatables = await this.notificationsQueue.getRepeatableJobs();
            for (const r of existingRepeatables) {
                if (cronJobNames.has(r.name)) {
                    await this.notificationsQueue.removeRepeatableByKey(r.key);
                }
            }
            const delayedJobs = await this.notificationsQueue.getDelayed();
            for (const job of delayedJobs) {
                if (cronJobNames.has(job.name)) {
                    await job.remove();
                }
            }
            const reconRepeatables = await this.reconciliationQueue.getRepeatableJobs();
            for (const r of reconRepeatables) {
                await this.reconciliationQueue.removeRepeatableByKey(r.key);
            }
            const reconDelayed = await this.reconciliationQueue.getDelayed();
            for (const job of reconDelayed) {
                await job.remove();
            }
        }
        catch (err) {
            this.logger.warn('Failed to clean up repeatable jobs', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        try {
            const cron = process.env.RECONCILE_CRON || '*/5 * * * *';
            await this.reconciliationQueue.add('reconcile-paystack', {}, { repeat: { cron }, removeOnComplete: true });
            this.logger.log(`Scheduled reconcile-paystack job cron=${cron}`);
        }
        catch (err) {
            this.logger.warn('Failed to schedule reconcile job', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        try {
            const lateCron = process.env.LATEFEE_CRON || '0 0 * * *';
            await this.notificationsQueue.add('apply-late-fees', {}, { repeat: { cron: lateCron }, removeOnComplete: true });
            this.logger.log(`Scheduled apply-late-fees job cron=${lateCron}`);
        }
        catch (err) {
            this.logger.warn('Failed to schedule late-fee job', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        try {
            const expireCron = process.env.INVITATION_EXPIRE_CRON || '30 0 * * *';
            await this.notificationsQueue.add('expire-invitations', {}, { repeat: { cron: expireCron }, removeOnComplete: true });
            this.logger.log(`Scheduled expire-invitations job cron=${expireCron}`);
        }
        catch (err) {
            this.logger.warn('Failed to schedule expire-invitations job', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        try {
            const timeoutCron = process.env.CYCLE_TIMEOUT_CRON || '0 1 * * *';
            await this.notificationsQueue.add('cycle-timeout-sweep', {}, { repeat: { cron: timeoutCron }, removeOnComplete: true });
            this.logger.log(`Scheduled cycle-timeout-sweep job cron=${timeoutCron}`);
        }
        catch (err) {
            this.logger.warn('Failed to schedule cycle-timeout-sweep job', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        try {
            const reprovisionCron = process.env.REPROVISION_CRON || '*/30 * * * *';
            await this.notificationsQueue.add('reprovision-wallets', {}, { repeat: { cron: reprovisionCron }, removeOnComplete: true });
            this.logger.log(`Scheduled reprovision-wallets sweep cron=${reprovisionCron}`);
        }
        catch (err) {
            this.logger.warn('Failed to schedule reprovision-wallets job', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        [this.paymentsWorker, this.payoutsWorker, this.notificationsWorker]
            .filter((w) => !!w)
            .forEach((w) => {
            w.on('failed', (job, err) => {
                this.logger.error(`Job ${job.id} failed: ${(err === null || err === void 0 ? void 0 : err.message) || err}`);
            });
            w.on('completed', (job) => {
                this.logger.log(`Job ${job.id} completed`);
            });
        });
        this.logger.log('BullMQ queues & workers initialized');
    }
    async addPaymentJob(name, data, opts = {}) {
        const defaultOpts = {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
            removeOnComplete: true,
            removeOnFail: false,
            ...opts,
        };
        const meta = (data === null || data === void 0 ? void 0 : data.__meta) || (data === null || data === void 0 ? void 0 : data.meta) || {};
        const requestId = meta.requestId || (data === null || data === void 0 ? void 0 : data.requestId) || null;
        const jobData = { ...data, __meta: { ...meta, requestId } };
        return this.paymentsQueue.add(name, jobData, defaultOpts);
    }
    async scheduleAutoDebit(cycle) {
        const contributionDate = typeof cycle.contributionDate === 'string' ? new Date(cycle.contributionDate) : cycle.contributionDate;
        const now = new Date();
        let delay = contributionDate.getTime() - now.getTime();
        if (delay < 0)
            delay = 0;
        return this.paymentsQueue.add('auto-debit-cycle', { cycleId: cycle.id }, { jobId: cycle.id, delay, attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: { count: 50 }, removeOnFail: false });
    }
    async cancelScheduledPayment(jobId) {
        try {
            const job = await this.paymentsQueue.getJob(jobId);
            if (job) {
                await job.remove();
                this.logger.log(`Cancelled scheduled payment job ${jobId}`);
                return true;
            }
            return false;
        }
        catch (err) {
            this.logger.warn(`Could not cancel payment job ${jobId}: ${err === null || err === void 0 ? void 0 : err.message}`);
            return false;
        }
    }
    async addPayoutJob(name, data, opts = {}) {
        const defaultOpts = {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            removeOnComplete: { age: 60 * 60 },
            ...opts,
        };
        const meta = (data === null || data === void 0 ? void 0 : data.__meta) || (data === null || data === void 0 ? void 0 : data.meta) || {};
        const requestId = meta.requestId || (data === null || data === void 0 ? void 0 : data.requestId) || null;
        const jobData = { ...data, __meta: { ...meta, requestId } };
        return this.payoutsQueue.add(name, jobData, defaultOpts);
    }
    async addNotificationJob(name, data, opts = {}) {
        const defaultOpts = {
            attempts: 3,
            backoff: {
                type: 'fixed',
                delay: 500,
            },
            removeOnComplete: { age: 60 * 60 },
            ...opts,
        };
        const meta = (data === null || data === void 0 ? void 0 : data.__meta) || (data === null || data === void 0 ? void 0 : data.meta) || {};
        const requestId = meta.requestId || (data === null || data === void 0 ? void 0 : data.requestId) || null;
        const jobData = { ...data, __meta: { ...meta, requestId } };
        return this.notificationsQueue.add(name, jobData, defaultOpts);
    }
    async triggerReconciliation() {
        return this.reconciliationQueue.add('reconcile-paystack', { triggeredAt: new Date().toISOString() }, { removeOnComplete: true, attempts: 1 });
    }
    async onModuleDestroy() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        try {
            await Promise.all([
                (_a = this.paymentsScheduler) === null || _a === void 0 ? void 0 : _a.close(),
                (_b = this.payoutsScheduler) === null || _b === void 0 ? void 0 : _b.close(),
                (_c = this.notificationsScheduler) === null || _c === void 0 ? void 0 : _c.close(),
                (_d = this.reconciliationScheduler) === null || _d === void 0 ? void 0 : _d.close(),
                (_e = this.paymentsWorker) === null || _e === void 0 ? void 0 : _e.close(),
                (_f = this.payoutsWorker) === null || _f === void 0 ? void 0 : _f.close(),
                (_g = this.notificationsWorker) === null || _g === void 0 ? void 0 : _g.close(),
                (_h = this.paymentsQueue) === null || _h === void 0 ? void 0 : _h.close(),
                (_j = this.payoutsQueue) === null || _j === void 0 ? void 0 : _j.close(),
                (_k = this.notificationsQueue) === null || _k === void 0 ? void 0 : _k.close(),
                (_l = this.reconciliationQueue) === null || _l === void 0 ? void 0 : _l.close(),
                (_m = this.redisConnection) === null || _m === void 0 ? void 0 : _m.quit(),
            ]);
            this.logger.log('BullMQ queues & workers shut down');
        }
        catch (err) {
            this.logger.error('Error shutting down queues', err);
        }
    }
};
exports.QueueService = QueueService;
exports.QueueService = QueueService = QueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        notifications_processor_service_1.NotificationsProcessorService,
        payments_processor_service_1.PaymentsProcessorService])
], QueueService);
//# sourceMappingURL=queue.service.js.map