"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const express_1 = require("express");
const redis_health_1 = require("./redis.health");
const prisma_service_1 = require("../infrastructure/prisma/prisma.service");
const public_decorator_1 = require("../common/decorators/public.decorator");
const queue_service_1 = require("../infrastructure/queue/queue.service");
const CRITICAL_ENV_VARS = [
    'DATABASE_URL',
    'JWT_SECRET',
    'REDIS_HOST',
    'REDIS_PORT',
    'PAYSTACK_SECRET_KEY',
];
const MEMORY_WARN_THRESHOLD = 0.85;
let HealthController = class HealthController {
    constructor(prismaService, redis, queueService) {
        this.prismaService = prismaService;
        this.redis = redis;
        this.queueService = queueService;
    }
    live() {
        return {
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
        };
    }
    async ready(res) {
        const [database, redis] = await Promise.all([
            this.checkDatabase(),
            Promise.resolve(this.checkRedis()),
        ]);
        const ready = database.status === 'up' && redis.status === 'up';
        return res.status(ready ? common_1.HttpStatus.OK : common_1.HttpStatus.SERVICE_UNAVAILABLE).json({
            status: ready ? 'ready' : 'not_ready',
            timestamp: new Date().toISOString(),
            services: { database, redis },
        });
    }
    async check() {
        const [database, redis, queues, memory, environment] = await Promise.all([
            this.checkDatabase(),
            Promise.resolve(this.checkRedis()),
            this.checkQueues(),
            Promise.resolve(this.checkMemory()),
            Promise.resolve(this.checkEnvironment()),
        ]);
        const critical = [database, redis];
        const allCriticalUp = critical.every(s => s.status === 'up');
        return {
            status: allCriticalUp ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            services: { database, redis, queues, memory, environment },
        };
    }
    async checkDatabase() {
        var _a;
        try {
            await this.prismaService.$queryRaw `SELECT 1`;
            return { status: 'up' };
        }
        catch (err) {
            return { status: 'down', reason: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : 'Database query failed' };
        }
    }
    checkRedis() {
        const { status } = this.redis.getRedisStatus();
        return status === 'ready'
            ? { status: 'up' }
            : { status: 'down', reason: `Redis is not ready (status: ${status})` };
    }
    async checkQueues() {
        var _a;
        try {
            const results = {};
            const queues = [
                { name: 'payments', q: this.queueService.paymentsQueue },
                { name: 'payouts', q: this.queueService.payoutsQueue },
                { name: 'notifications', q: this.queueService.notificationsQueue },
                { name: 'reconciliation', q: this.queueService.reconciliationQueue },
            ];
            for (const { name, q } of queues) {
                try {
                    const [waiting, active, failed, delayed, isPaused] = await Promise.all([
                        q.getWaitingCount(),
                        q.getActiveCount(),
                        q.getFailedCount(),
                        q.getDelayedCount(),
                        q.isPaused(),
                    ]);
                    results[name] = { waiting, active, failed, delayed, paused: isPaused };
                }
                catch (err) {
                    results[name] = { status: 'down', reason: err === null || err === void 0 ? void 0 : err.message };
                }
            }
            const anyDown = Object.values(results).some((r) => r.status === 'down');
            return { status: anyDown ? 'down' : 'up', queues: results };
        }
        catch (err) {
            return { status: 'down', reason: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : 'Queue check failed' };
        }
    }
    checkMemory() {
        const mem = process.memoryUsage();
        const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
        const rssMB = Math.round(mem.rss / 1024 / 1024);
        const ratio = mem.heapUsed / mem.heapTotal;
        const status = ratio > MEMORY_WARN_THRESHOLD ? 'warn' : 'up';
        const result = {
            status,
            heapUsedMB,
            heapTotalMB,
            rssMB,
            heapUsagePercent: Math.round(ratio * 100),
        };
        if (status === 'warn') {
            result.reason = `Heap usage is at ${result.heapUsagePercent}% — approaching limit`;
        }
        return result;
    }
    checkEnvironment() {
        const missing = CRITICAL_ENV_VARS.filter(key => !process.env[key]);
        if (missing.length === 0) {
            return { status: 'up' };
        }
        return {
            status: 'down',
            reason: `Missing critical environment variables: ${missing.join(', ')}`,
            missing,
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)('live'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Liveness probe', description: 'Returns 200 instantly if the process is running. Use for uptime monitors / load balancer pings.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Process is alive.' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "live", null);
__decorate([
    (0, common_1.Get)('ready'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Readiness probe', description: 'Returns 200 only if both database and Redis are reachable. Use for k8s readiness or pre-deploy checks.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'App is ready to serve traffic.' }),
    (0, swagger_1.ApiResponse)({ status: 503, description: 'App is NOT ready — one or more critical services are down.' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_a = typeof express_1.Response !== "undefined" && express_1.Response) === "function" ? _a : Object]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "ready", null);
__decorate([
    (0, common_1.Get)(),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Full health check', description: 'Returns detailed status of database, Redis, queues, memory, and environment. Always HTTP 200 — inspect the `status` field.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '`status` will be `ok` if everything is healthy, or `degraded` with details on what is failing.' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK, type: Object }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "check", null);
exports.HealthController = HealthController = __decorate([
    (0, swagger_1.ApiTags)('Health'),
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_health_1.RedisHealthIndicator,
        queue_service_1.QueueService])
], HealthController);
//# sourceMappingURL=health.controller.js.map