import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { RedisService } from '../infrastructure/redis/redis.service';
export declare class RedisHealthIndicator extends HealthIndicator {
    private readonly redisService;
    constructor(redisService: RedisService);
    getRedisStatus(): {
        status: string;
        reason?: string;
    };
    isHealthy(key?: string): Promise<HealthIndicatorResult>;
}
