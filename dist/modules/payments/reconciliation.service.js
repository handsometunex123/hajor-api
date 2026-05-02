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
var ReconciliationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const paystack_service_1 = require("../../infrastructure/paystack/paystack.service");
const payment_webhook_service_1 = require("./payment-webhook.service");
let ReconciliationService = ReconciliationService_1 = class ReconciliationService {
    constructor(prisma, paystack, webhook) {
        this.prisma = prisma;
        this.paystack = paystack;
        this.webhook = webhook;
        this.logger = new common_1.Logger(ReconciliationService_1.name);
    }
    async reconcilePending(limit = 200) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        this.logger.log('Starting reconciliation of pending transactions');
        const pending = await this.prisma.transaction.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: limit });
        for (const tx of pending) {
            try {
                const refMatch = tx.reference.match(/\|ref:(.+)$/);
                const ref = refMatch ? refMatch[1] : tx.reference;
                if (!ref)
                    continue;
                try {
                    const res = await this.paystack.getTransaction(ref);
                    const status = ((_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a.status) || ((_c = (_b = res === null || res === void 0 ? void 0 : res.data) === null || _b === void 0 ? void 0 : _b.transaction) === null || _c === void 0 ? void 0 : _c.status) || null;
                    const providerId = ((_d = res === null || res === void 0 ? void 0 : res.data) === null || _d === void 0 ? void 0 : _d.id) || ((_f = (_e = res === null || res === void 0 ? void 0 : res.data) === null || _e === void 0 ? void 0 : _e.transaction) === null || _f === void 0 ? void 0 : _f.id) || null;
                    if (status && /success/i.test(status)) {
                        await this.webhook.confirmProviderCharge({ provider: 'paystack', providerId: providerId || 'unknown', reference: ref, amount: ((_g = res === null || res === void 0 ? void 0 : res.data) === null || _g === void 0 ? void 0 : _g.amount) ? (res.data.amount / 100) : undefined, providerStatus: status });
                    }
                    else if (status && /failed|error/i.test(status)) {
                        await this.webhook.confirmProviderCharge({ provider: 'paystack', providerId: providerId || 'unknown', reference: ref, amount: ((_h = res === null || res === void 0 ? void 0 : res.data) === null || _h === void 0 ? void 0 : _h.amount) ? (res.data.amount / 100) : undefined, providerStatus: status });
                    }
                }
                catch (err) {
                    this.logger.debug(`Could not fetch paystack transaction for ref=${ref}: ${(err === null || err === void 0 ? void 0 : err.message) || err}`);
                }
            }
            catch (err) {
                this.logger.warn('Error reconciling transaction', (err === null || err === void 0 ? void 0 : err.message) || err);
            }
        }
        this.logger.log('Reconciliation run complete');
        return { checked: pending.length };
    }
};
exports.ReconciliationService = ReconciliationService;
exports.ReconciliationService = ReconciliationService = ReconciliationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, paystack_service_1.PaystackService, payment_webhook_service_1.PaymentWebhookService])
], ReconciliationService);
//# sourceMappingURL=reconciliation.service.js.map