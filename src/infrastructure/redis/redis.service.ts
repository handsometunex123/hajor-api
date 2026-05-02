import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { MonitoringService } from '../monitoring/monitoring.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly monitor: MonitoringService,
  ) {}

  onModuleInit() {
    const host = this.config.get<string>('REDIS_HOST', '127.0.0.1');
    const port = parseInt(this.config.get<string>('REDIS_PORT', '6379'), 10);
    const db = parseInt(this.config.get<string>('REDIS_DB', '0'), 10);
    // lazyConnect: true – do not auto-connect on creation; the first command triggers it.
    // This prevents ioredis from throwing unhandled 'error' events during startup
    // that would crash Node.js when Redis is unreachable.
    this.client = new Redis({
      host,
      port,
      db,
      lazyConnect: true,
      enableOfflineQueue: true,
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => Math.min(times * 200, 5000),
    });

    // CRITICAL: attach 'error' listener so Node.js does not crash on connection failures.
    // Without this, any ioredis connection error is an unhandled EventEmitter error → process exit.
    this.client.on('error', (err: any) => {
      this.logger.error(`Redis error: ${err?.message ?? err}`);
      try {
        this.monitor.alert('redis_error', { host, port, db, error: err?.message ?? String(err) });
      } catch (_) {}
    });

    this.client.on('connect', () => {
      this.logger.log(`Redis connected ${host}:${port} db=${db}`);
    });

    this.client.on('reconnecting', () => {
      this.logger.warn(`Redis reconnecting to ${host}:${port} db=${db}...`);
    });

    // Initiate connection in background – failure is handled by the 'error' event above.
    this.client.connect().catch((err: any) => {
      this.logger.error(`Redis initial connect failed: ${err?.message ?? err}. Will retry automatically.`);
    });
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
    } catch (err) {
      // ignore
    }
  }

  getClient() {
    return this.client;
  }

  async get(key: string) {
    try {
      const v = await this.client.get(key);
      if (!v) return null;
      try {
        return JSON.parse(v);
      } catch (err) {
        return v;
      }
    } catch (err: any) {
      this.monitor.alert('redis_get_error', { key, error: err?.message ?? String(err) });
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number) {
    try {
      const v = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, v, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, v);
      }
    } catch (err: any) {
      this.monitor.alert('redis_set_error', { key, error: err?.message ?? String(err) });
    }
  }

  async del(key: string) {
    try {
      await this.client.del(key);
    } catch (err: any) {
      this.monitor.alert('redis_del_error', { key, error: err?.message ?? String(err) });
    }
  }

  async incr(key: string) {
    try {
      return await this.client.incr(key);
    } catch (err: any) {
      this.monitor.alert('redis_incr_error', { key, error: err?.message ?? String(err) });
      return null;
    }
  }

  async ttl(key: string) {
    try {
      return await this.client.ttl(key);
    } catch (err: any) {
      this.monitor.alert('redis_ttl_error', { key, error: err?.message ?? String(err) });
      return null;
    }
  }
}
