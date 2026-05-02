import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  async increment(key: string, ttl: number): Promise<{ totalHits: number; timeToExpire: number }> {
    const client = this.redis.getClient();
    const totalHits = await client.incr(key);
    if (totalHits === 1) {
      await client.expire(key, ttl);
    }
    const timeToExpire = await client.ttl(key);
    return { totalHits, timeToExpire };
  }
}
