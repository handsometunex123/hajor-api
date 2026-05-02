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
var PaystackAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackAdapter = void 0;
const common_1 = require("@nestjs/common");
const paystack_service_1 = require("../paystack/paystack.service");
const payment_webhook_service_1 = require("../../modules/payments/payment-webhook.service");
let PaystackAdapter = PaystackAdapter_1 = class PaystackAdapter {
    constructor(paystack, webhook) {
        this.paystack = paystack;
        this.webhook = webhook;
        this.logger = new common_1.Logger(PaystackAdapter_1.name);
    }
    verifySignature(rawBody, signatureHeader) {
        return this.paystack.verifySignature(rawBody, signatureHeader);
    }
    async handleEvent(evt) {
        var _a, _b, _c, _d, _e;
        const event = evt.event;
        const data = evt.data;
        const amountRaw = (_c = (_a = data === null || data === void 0 ? void 0 : data.amount) !== null && _a !== void 0 ? _a : (_b = data === null || data === void 0 ? void 0 : data.transaction) === null || _b === void 0 ? void 0 : _b.amount) !== null && _c !== void 0 ? _c : null;
        let amount = amountRaw;
        if (typeof amount === 'number' && amount > 1000)
            amount = amount / 100;
        const providerId = (data === null || data === void 0 ? void 0 : data.id) || ((_d = data === null || data === void 0 ? void 0 : data.transaction) === null || _d === void 0 ? void 0 : _d.id) || (data === null || data === void 0 ? void 0 : data.reference) || null;
        const reference = (data === null || data === void 0 ? void 0 : data.reference) || ((_e = data === null || data === void 0 ? void 0 : data.transaction) === null || _e === void 0 ? void 0 : _e.reference) || null;
        if (event && /charge\.success|invoice\.payment|deposit/i.test(event)) {
            return this.webhook.handleProviderDeposit({ provider: 'paystack', providerId: providerId || reference || 'unknown', reference, amount, metadata: data });
        }
        if (event && /charge\.success|charge\.failed|transfer\.success|transfer\.failed/i.test(event)) {
            const status = (data === null || data === void 0 ? void 0 : data.status) || event;
            return this.webhook.confirmProviderCharge({ provider: 'paystack', providerId: providerId || reference || 'unknown', reference, amount, providerStatus: status });
        }
        this.logger.debug(`Unhandled paystack event ${event}`);
        return { ok: true, handled: false };
    }
};
exports.PaystackAdapter = PaystackAdapter;
exports.PaystackAdapter = PaystackAdapter = PaystackAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [paystack_service_1.PaystackService, payment_webhook_service_1.PaymentWebhookService])
], PaystackAdapter);
//# sourceMappingURL=paystack.adapter.js.map