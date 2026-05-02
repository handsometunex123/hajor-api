"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutsModule = void 0;
const common_1 = require("@nestjs/common");
const payouts_service_1 = require("./payouts.service");
const prisma_module_1 = require("../../infrastructure/prisma/prisma.module");
const queue_module_1 = require("../../infrastructure/queue/queue.module");
const payouts_controller_1 = require("./payouts.controller");
const transactions_module_1 = require("../transactions/transactions.module");
const payment_webhook_controller_1 = require("../payments/payment-webhook.controller");
const payment_webhook_service_1 = require("../payments/payment-webhook.service");
const payment_intent_controller_1 = require("../payments/payment-intent.controller");
const payment_intent_service_1 = require("../payments/payment-intent.service");
const withdraw_controller_1 = require("./withdraw.controller");
const withdraw_service_1 = require("./withdraw.service");
const paystack_service_1 = require("../../infrastructure/paystack/paystack.service");
const paystack_adapter_1 = require("../../infrastructure/payments/paystack.adapter");
const reconciliation_service_1 = require("../payments/reconciliation.service");
const users_module_1 = require("../users/users.module");
let PayoutsModule = class PayoutsModule {
};
exports.PayoutsModule = PayoutsModule;
exports.PayoutsModule = PayoutsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, queue_module_1.QueueModule, transactions_module_1.TransactionsModule, users_module_1.UsersModule],
        providers: [payouts_service_1.PayoutsService, payment_webhook_service_1.PaymentWebhookService, paystack_service_1.PaystackService, paystack_adapter_1.PaystackAdapter, reconciliation_service_1.ReconciliationService, payment_intent_service_1.PaymentIntentService, withdraw_service_1.WithdrawService],
        controllers: [payouts_controller_1.PayoutsController, payment_webhook_controller_1.PaymentWebhookController, payment_intent_controller_1.PaymentIntentController, withdraw_controller_1.WithdrawController],
        exports: [payouts_service_1.PayoutsService],
    })
], PayoutsModule);
//# sourceMappingURL=payouts.module.js.map