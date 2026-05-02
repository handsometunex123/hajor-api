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
exports.RedisHealthIndicator = void 0;
const common_1 = require("@nestjs/common");
const terminus_1 = require("@nestjs/terminus");
const redis_service_1 = require("../infrastructure/redis/redis.service");
let RedisHealthIndicator = class RedisHealthIndicator extends terminus_1.HealthIndicator {
    constructor(redisService) {
        super();
        this.redisService = redisService;
    }
    getRedisStatus() {
        var _a;
        const client = this.redisService.getClient();
        const status = (_a = client === null || client === void 0 ? void 0 : client.status) !== null && _a !== void 0 ? _a : 'unknown';
        return { status };
    }
    async isHealthy(key = 'redis') {
        const { status } = this.getRedisStatus();
        if (status === 'ready') {
            return this.getStatus(key, true);
        }
        throw new terminus_1.HealthCheckError('Redis check failed', this.getStatus(key, false, { reason: `Redis is not ready (status: ${status})` }));
    }
};
exports.RedisHealthIndicator = RedisHealthIndicator;
exports.RedisHealthIndicator = RedisHealthIndicator = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], RedisHealthIndicator);
//# sourceMappingURL=redis.health.js.map