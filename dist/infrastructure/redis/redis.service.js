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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const monitoring_service_1 = require("../monitoring/monitoring.service");
let RedisService = RedisService_1 = class RedisService {
    constructor(config, monitor) {
        this.config = config;
        this.monitor = monitor;
        this.logger = new common_1.Logger(RedisService_1.name);
    }
    onModuleInit() {
        const host = this.config.get('REDIS_HOST', '127.0.0.1');
        const port = parseInt(this.config.get('REDIS_PORT', '6379'), 10);
        const db = parseInt(this.config.get('REDIS_DB', '0'), 10);
        this.client = new ioredis_1.default({
            host,
            port,
            db,
            lazyConnect: true,
            enableOfflineQueue: true,
            maxRetriesPerRequest: null,
            retryStrategy: (times) => Math.min(times * 200, 5000),
        });
        this.client.on('error', (err) => {
            var _a, _b;
            this.logger.error(`Redis error: ${(_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err}`);
            try {
                this.monitor.alert('redis_error', { host, port, db, error: (_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : String(err) });
            }
            catch (_) { }
        });
        this.client.on('connect', () => {
            this.logger.log(`Redis connected ${host}:${port} db=${db}`);
        });
        this.client.on('reconnecting', () => {
            this.logger.warn(`Redis reconnecting to ${host}:${port} db=${db}...`);
        });
        this.client.connect().catch((err) => {
            var _a;
            this.logger.error(`Redis initial connect failed: ${(_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err}. Will retry automatically.`);
        });
    }
    async onModuleDestroy() {
        try {
            await this.client.quit();
        }
        catch (err) {
        }
    }
    getClient() {
        return this.client;
    }
    async get(key) {
        var _a;
        try {
            const v = await this.client.get(key);
            if (!v)
                return null;
            try {
                return JSON.parse(v);
            }
            catch (err) {
                return v;
            }
        }
        catch (err) {
            this.monitor.alert('redis_get_error', { key, error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) });
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        var _a;
        try {
            const v = typeof value === 'string' ? value : JSON.stringify(value);
            if (ttlSeconds && ttlSeconds > 0) {
                await this.client.set(key, v, 'EX', ttlSeconds);
            }
            else {
                await this.client.set(key, v);
            }
        }
        catch (err) {
            this.monitor.alert('redis_set_error', { key, error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) });
        }
    }
    async del(key) {
        var _a;
        try {
            await this.client.del(key);
        }
        catch (err) {
            this.monitor.alert('redis_del_error', { key, error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) });
        }
    }
    async incr(key) {
        var _a;
        try {
            return await this.client.incr(key);
        }
        catch (err) {
            this.monitor.alert('redis_incr_error', { key, error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) });
            return null;
        }
    }
    async ttl(key) {
        var _a;
        try {
            return await this.client.ttl(key);
        }
        catch (err) {
            this.monitor.alert('redis_ttl_error', { key, error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) });
            return null;
        }
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        monitoring_service_1.MonitoringService])
], RedisService);
//# sourceMappingURL=redis.service.js.map