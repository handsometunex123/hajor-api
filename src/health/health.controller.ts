import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { RedisHealthIndicator } from './redis.health';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';
import { QueueService } from '../infrastructure/queue/queue.service';

const CRITICAL_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REDIS_HOST',
  'REDIS_PORT',
  'PAYSTACK_SECRET_KEY',
];

const MEMORY_WARN_THRESHOLD = 0.85; // warn when heap is >85% of heap total

interface ServiceHealth {
  status: 'up' | 'down' | 'warn';
  reason?: string;
  [key: string]: any;
}

interface FullHealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    queues: ServiceHealth;
    memory: ServiceHealth;
    environment: ServiceHealth;
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redis: RedisHealthIndicator,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Liveness probe — is the process alive?
   * Use this for load balancer or uptime-monitor pings.
   * Always returns 200 as long as the Node.js process is running.
   */
  @Get('live')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe', description: 'Returns 200 instantly if the process is running. Use for uptime monitors / load balancer pings.' })
  @ApiResponse({ status: 200, description: 'Process is alive.' })
  live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }

  /**
   * Readiness probe — can the app serve traffic?
   * Returns 200 only if both DB and Redis are reachable.
   * Use for k8s readiness probes or pre-deploy checks.
   */
  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness probe', description: 'Returns 200 only if both database and Redis are reachable. Use for k8s readiness or pre-deploy checks.' })
  @ApiResponse({ status: 200, description: 'App is ready to serve traffic.' })
  @ApiResponse({ status: 503, description: 'App is NOT ready — one or more critical services are down.' })
  async ready(@Res() res: Response) {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      Promise.resolve(this.checkRedis()),
    ]);

    const ready = database.status === 'up' && redis.status === 'up';

    return res.status(ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      services: { database, redis },
    });
  }

  /**
   * Full health check — detailed status of all subsystems.
   * Always returns 200. Check the `status` field: `ok` or `degraded`.
   */
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Full health check', description: 'Returns detailed status of database, Redis, queues, memory, and environment. Always HTTP 200 — inspect the `status` field.' })
  @ApiResponse({ status: 200, description: '`status` will be `ok` if everything is healthy, or `degraded` with details on what is failing.' })
  async check(): Promise<FullHealthResponse> {
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

  // ─── Private checks ──────────────────────────────────────────────────────────

  private async checkDatabase(): Promise<ServiceHealth> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return { status: 'up' };
    } catch (err: any) {
      return { status: 'down', reason: err?.message ?? 'Database query failed' };
    }
  }

  private checkRedis(): ServiceHealth {
    const { status } = this.redis.getRedisStatus();
    return status === 'ready'
      ? { status: 'up' }
      : { status: 'down', reason: `Redis is not ready (status: ${status})` };
  }

  private async checkQueues(): Promise<ServiceHealth> {
    try {
      const results: Record<string, any> = {};
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
        } catch (err: any) {
          results[name] = { status: 'down', reason: err?.message };
        }
      }

      const anyDown = Object.values(results).some((r: any) => r.status === 'down');
      return { status: anyDown ? 'down' : 'up', queues: results };
    } catch (err: any) {
      return { status: 'down', reason: err?.message ?? 'Queue check failed' };
    }
  }

  private checkMemory(): ServiceHealth {
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const rssMB = Math.round(mem.rss / 1024 / 1024);
    const ratio = mem.heapUsed / mem.heapTotal;

    const status = ratio > MEMORY_WARN_THRESHOLD ? 'warn' : 'up';
    const result: ServiceHealth = {
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

  private checkEnvironment(): ServiceHealth {
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
}
