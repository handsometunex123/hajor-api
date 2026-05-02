import { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from '../redis/redis.service';
export declare class RedisThrottlerStorage implements ThrottlerStorage {
    private readonly redis;
    constructor(redis: RedisService);
    increment(key: string, ttl: number): Promise<{
        totalHits: number;
        timeToExpire: number;
    }>;
}
