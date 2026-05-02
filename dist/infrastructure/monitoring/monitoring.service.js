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
var MonitoringService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let MonitoringService = MonitoringService_1 = class MonitoringService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(MonitoringService_1.name);
        this.webhook = this.config.get('ALERT_WEBHOOK_URL');
    }
    async alert(event, details) {
        var _a;
        const payload = { event, timestamp: new Date().toISOString(), details };
        this.logger.error(`[monitor] ${event} ${JSON.stringify(details !== null && details !== void 0 ? details : {})}`);
        if (!this.webhook)
            return;
        try {
            const timeoutMs = parseInt(this.config.get('ALERT_WEBHOOK_TIMEOUT_MS', '5000'), 10);
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeoutMs);
            const headers = { 'content-type': 'application/json' };
            if (details && details.requestId)
                headers['x-request-id'] = details.requestId;
            await fetch(this.webhook, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            clearTimeout(id);
        }
        catch (err) {
            this.logger.error(`[monitor] failed to send alert to webhook: ${(_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err}`);
        }
    }
};
exports.MonitoringService = MonitoringService;
exports.MonitoringService = MonitoringService = MonitoringService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MonitoringService);
//# sourceMappingURL=monitoring.service.js.map