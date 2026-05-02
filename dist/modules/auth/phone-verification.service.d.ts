import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
export declare class PhoneVerificationService {
    private readonly redis;
    private readonly queue;
    private readonly config;
    constructor(redis: RedisService, queue: QueueService, config: ConfigService);
    sendOtp(phone: string): Promise<{
        message: string;
        expiresInSeconds: number;
    }>;
    verifyOtp(phone: string, otp: string): Promise<{
        ok: boolean;
    }>;
}
