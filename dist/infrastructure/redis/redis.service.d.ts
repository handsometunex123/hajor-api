import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { MonitoringService } from '../monitoring/monitoring.service';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly config;
    private readonly monitor;
    private client;
    private readonly logger;
    constructor(config: ConfigService, monitor: MonitoringService);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    getClient(): Redis;
    get(key: string): Promise<any>;
    set(key: string, value: any, ttlSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    incr(key: string): Promise<number>;
    ttl(key: string): Promise<number>;
}
