import { Response } from 'express';
import { RedisHealthIndicator } from './redis.health';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { QueueService } from '../infrastructure/queue/queue.service';
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
export declare class HealthController {
    private readonly prismaService;
    private readonly redis;
    private readonly queueService;
    constructor(prismaService: PrismaService, redis: RedisHealthIndicator, queueService: QueueService);
    live(): {
        status: string;
        timestamp: string;
        uptime: number;
    };
    ready(res: Response): Promise<any>;
    check(): Promise<FullHealthResponse>;
    private checkDatabase;
    private checkRedis;
    private checkQueues;
    private checkMemory;
    private checkEnvironment;
}
export {};
