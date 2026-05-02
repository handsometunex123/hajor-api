import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { RedisService } from '../infrastructure/redis/redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  /** Returns the raw ioredis client status and any associated error reason. */
  getRedisStatus(): { status: string; reason?: string } {
    const client = this.redisService.getClient();
    const status = client?.status ?? 'unknown';
    return { status };
  }

  /** Terminus-compatible check — throws HealthCheckError when Redis is not ready. */
  async isHealthy(key = 'redis'): Promise<HealthIndicatorResult> {
    const { status } = this.getRedisStatus();
    if (status === 'ready') {
      return this.getStatus(key, true);
    }
    throw new HealthCheckError(
      'Redis check failed',
      this.getStatus(key, false, { reason: `Redis is not ready (status: ${status})` }),
    );
  }
}

