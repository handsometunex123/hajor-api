"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const queue_service_1 = require("./queue.service");
const payment_queue_service_1 = require("./payment-queue.service");
const notification_queue_service_1 = require("./notification-queue.service");
const notifications_processor_service_1 = require("./notifications-processor.service");
const payments_processor_service_1 = require("./payments-processor.service");
const transactions_module_1 = require("../../modules/transactions/transactions.module");
let QueueModule = class QueueModule {
};
exports.QueueModule = QueueModule;
exports.QueueModule = QueueModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, transactions_module_1.TransactionsModule],
        providers: [queue_service_1.QueueService, payment_queue_service_1.PaymentQueueService, notification_queue_service_1.NotificationQueueService, notifications_processor_service_1.NotificationsProcessorService, payments_processor_service_1.PaymentsProcessorService],
        exports: [queue_service_1.QueueService, payment_queue_service_1.PaymentQueueService, notification_queue_service_1.NotificationQueueService, notifications_processor_service_1.NotificationsProcessorService, payments_processor_service_1.PaymentsProcessorService],
    })
], QueueModule);
//# sourceMappingURL=queue.module.js.map