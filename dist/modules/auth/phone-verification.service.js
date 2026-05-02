"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhoneVerificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const redis_service_1 = require("../../infrastructure/redis/redis.service");
const queue_service_1 = require("../../infrastructure/queue/queue.service");
const crypto_1 = require("crypto");
let PhoneVerificationService = class PhoneVerificationService {
    constructor(redis, queue, config) {
        this.redis = redis;
        this.queue = queue;
        this.config = config;
    }
    async sendOtp(phone) {
        const otp = (0, crypto_1.randomInt)(100000, 999999).toString();
        const ttl = parseInt(this.config.get('PHONE_OTP_TTL_SECONDS', '300'), 10);
        const key = `phone_verify:${phone}`;
        await this.redis.set(key, otp, ttl);
        const message = `Your verification code is: ${otp}. It expires in ${Math.floor(ttl / 60)} minutes.`;
        await this.queue.addNotificationJob('send-sms', { phone, message });
        return { message: 'OTP sent', expiresInSeconds: ttl };
    }
    async verifyOtp(phone, otp) {
        const key = `phone_verify:${phone}`;
        const stored = await this.redis.get(key);
        if (!stored || stored !== otp) {
            throw new common_1.BadRequestException('Invalid or expired OTP');
        }
        try {
            await this.redis.del(key);
        }
        catch (_) { }
        return { ok: true };
    }
};
exports.PhoneVerificationService = PhoneVerificationService;
exports.PhoneVerificationService = PhoneVerificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        queue_service_1.QueueService,
        config_1.ConfigService])
], PhoneVerificationService);
//# sourceMappingURL=phone-verification.service.js.map