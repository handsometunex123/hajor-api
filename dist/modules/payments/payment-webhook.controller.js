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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PaymentWebhookController_1;
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentWebhookController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const express_1 = require("express");
const payment_webhook_service_1 = require("./payment-webhook.service");
const payment_webhook_dto_1 = require("./payment-webhook.dto");
const paystack_service_1 = require("../../infrastructure/paystack/paystack.service");
const paystack_adapter_1 = require("../../infrastructure/payments/paystack.adapter");
const reconciliation_service_1 = require("./reconciliation.service");
const swagger_1 = require("@nestjs/swagger");
const wrap_response_1 = require("../../common/dto/wrap-response");
const jwt_guard_1 = require("../auth/jwt.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const processed_response_dto_1 = require("../../common/dto/processed-response.dto");
let PaymentWebhookController = PaymentWebhookController_1 = class PaymentWebhookController {
    constructor(webhook, paystack, adapter, recon) {
        this.webhook = webhook;
        this.paystack = paystack;
        this.adapter = adapter;
        this.recon = recon;
        this.logger = new common_1.Logger(PaymentWebhookController_1.name);
    }
    async charge(req, headers, body) {
        this.logger.log(`Received provider charge webhook provider=${body.provider} providerId=${body.providerId}`);
        if (body.provider === 'paystack') {
            const signature = headers['x-paystack-signature'];
            const raw = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
            const ok = this.paystack.verifySignature(raw, signature);
            if (!ok)
                throw new common_1.BadRequestException('Invalid paystack signature');
        }
        const tx = await this.webhook.handleProviderCharge({
            provider: body.provider,
            providerId: body.providerId,
            walletOwnerId: body.walletOwnerId,
            reference: body.reference,
            amount: body.amount,
            metadata: body.metadata,
        });
        return { ok: true, txId: tx.id };
    }
    async confirm(req, headers, body) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const provider = body.provider || ((_a = body.event) === null || _a === void 0 ? void 0 : _a.provider) || 'paystack';
        const providerId = body.providerId || ((_b = body.data) === null || _b === void 0 ? void 0 : _b.id) || ((_c = body.data) === null || _c === void 0 ? void 0 : _c.reference) || ((_e = (_d = body.data) === null || _d === void 0 ? void 0 : _d.transaction) === null || _e === void 0 ? void 0 : _e.id);
        const reference = body.reference || ((_f = body.data) === null || _f === void 0 ? void 0 : _f.reference) || ((_h = (_g = body.data) === null || _g === void 0 ? void 0 : _g.transaction) === null || _h === void 0 ? void 0 : _h.reference) || null;
        const amount = body.amount || ((_j = body.data) === null || _j === void 0 ? void 0 : _j.amount) || (body.data && body.data.amount / 100) || null;
        if (provider === 'paystack') {
            const signature = headers['x-paystack-signature'];
            const raw = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
            const ok = this.paystack.verifySignature(raw, signature);
            if (!ok)
                throw new common_1.BadRequestException('Invalid paystack signature');
        }
        const res = await this.webhook.confirmProviderCharge({ provider, providerId, reference, amount, providerStatus: body.event || ((_k = body.data) === null || _k === void 0 ? void 0 : _k.status) });
        if (res && res.found === false) {
            return this.webhook.confirmProviderTransfer({ provider, providerId, reference, amount, providerStatus: body.event || ((_l = body.data) === null || _l === void 0 ? void 0 : _l.status) });
        }
        return res;
    }
    async payout(req, headers, body) {
        this.logger.log(`Received provider payout webhook provider=${body.provider} providerId=${body.providerId}`);
        if (body.provider === 'paystack') {
            const signature = headers['x-paystack-signature'];
            const raw = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
            const ok = this.paystack.verifySignature(raw, signature);
            if (!ok)
                throw new common_1.BadRequestException('Invalid paystack signature');
        }
        const tx = await this.webhook.handleProviderPayout({ provider: body.provider, providerId: body.providerId, reference: body.reference, amount: body.amount, metadata: body.metadata });
        return { ok: true, txId: tx.id };
    }
    async paystackWebhook(req, headers, body) {
        const signature = headers['x-paystack-signature'];
        const raw = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
        const ok = this.paystack.verifySignature(raw, signature);
        if (!ok)
            throw new common_1.BadRequestException('Invalid paystack signature');
        const event = (body === null || body === void 0 ? void 0 : body.event) || (body === null || body === void 0 ? void 0 : body.eventName) || null;
        const data = (body === null || body === void 0 ? void 0 : body.data) || body;
        const res = await this.adapter.handleEvent({ event, data, raw: body });
        if (res && res.handled === false) {
            return this.confirm(req, headers, body);
        }
        return res;
    }
    async adminReconcile() {
        return this.recon.reconcilePending();
    }
};
exports.PaymentWebhookController = PaymentWebhookController;
__decorate([
    (0, common_1.Post)('charge'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Provider charge webhook (create or update internal tx)' }),
    (0, swagger_1.ApiBody)({ type: payment_webhook_dto_1.ProviderChargeDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Webhook processed', type: (0, wrap_response_1.wrapResponse)(processed_response_dto_1.ProcessedResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_a = typeof express_1.Request !== "undefined" && express_1.Request) === "function" ? _a : Object, Object, payment_webhook_dto_1.ProviderChargeDto]),
    __metadata("design:returntype", Promise)
], PaymentWebhookController.prototype, "charge", null);
__decorate([
    (0, common_1.Post)('confirm'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Provider confirmation webhook (settlement/failed)' }),
    (0, swagger_1.ApiBody)({ schema: { example: { provider: 'paystack', providerId: 'abc', reference: 'ref|ref:paymentId', event: 'success' } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Confirmation processed', type: (0, wrap_response_1.wrapResponse)(processed_response_dto_1.ProcessedResponseDto) }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof express_1.Request !== "undefined" && express_1.Request) === "function" ? _b : Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentWebhookController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)('payout'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Provider payout webhook' }),
    (0, swagger_1.ApiBody)({ type: payment_webhook_dto_1.ProviderPayoutDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payout webhook processed', type: (0, wrap_response_1.wrapResponse)(processed_response_dto_1.ProcessedResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof express_1.Request !== "undefined" && express_1.Request) === "function" ? _c : Object, Object, payment_webhook_dto_1.ProviderPayoutDto]),
    __metadata("design:returntype", Promise)
], PaymentWebhookController.prototype, "payout", null);
__decorate([
    (0, common_1.Post)('paystack'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Paystack native webhook handler (virtual-account deposits, generic events)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Webhook processed', type: (0, wrap_response_1.wrapResponse)(processed_response_dto_1.ProcessedResponseDto) }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof express_1.Request !== "undefined" && express_1.Request) === "function" ? _d : Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentWebhookController.prototype, "paystackWebhook", null);
__decorate([
    (0, common_1.Post)('admin/reconciliations/paystack'),
    (0, swagger_1.ApiOperation)({ summary: 'Admin: run paystack reconciliation (manual trigger)' }),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reconciliation result', type: (0, wrap_response_1.wrapResponse)(processed_response_dto_1.ProcessedResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentWebhookController.prototype, "adminReconcile", null);
exports.PaymentWebhookController = PaymentWebhookController = PaymentWebhookController_1 = __decorate([
    (0, swagger_1.ApiTags)('Payments'),
    (0, common_1.Controller)('webhooks/payments'),
    __metadata("design:paramtypes", [payment_webhook_service_1.PaymentWebhookService, paystack_service_1.PaystackService, paystack_adapter_1.PaystackAdapter, reconciliation_service_1.ReconciliationService])
], PaymentWebhookController);
//# sourceMappingURL=payment-webhook.controller.js.map