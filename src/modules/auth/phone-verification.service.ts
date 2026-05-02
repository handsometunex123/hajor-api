import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { randomInt } from 'crypto';

@Injectable()
export class PhoneVerificationService {
  constructor(
    private readonly redis: RedisService,
    private readonly queue: QueueService,
    private readonly config: ConfigService,
  ) {}

  async sendOtp(phone: string) {
    const otp = randomInt(100000, 999999).toString();
    const ttl = parseInt(this.config.get<string>('PHONE_OTP_TTL_SECONDS', '300'), 10); // default 5 min
    const key = `phone_verify:${phone}`;
    await this.redis.set(key, otp, ttl);

    const message = `Your verification code is: ${otp}. It expires in ${Math.floor(ttl/60)} minutes.`;
    await this.queue.addNotificationJob('send-sms', { phone, message });
    return { message: 'OTP sent', expiresInSeconds: ttl };
  }

  async verifyOtp(phone: string, otp: string) {
    const key = `phone_verify:${phone}`;
    const stored = await this.redis.get(key);
    if (!stored || stored !== otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    try { await this.redis.del(key); } catch (_) {}
    return { ok: true };
  }
}
