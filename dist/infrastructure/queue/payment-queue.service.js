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
var PaymentQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentQueueService = void 0;
const common_1 = require("@nestjs/common");
const queue_service_1 = require("./queue.service");
let PaymentQueueService = PaymentQueueService_1 = class PaymentQueueService {
    constructor(queue) {
        this.queue = queue;
        this.logger = new common_1.Logger(PaymentQueueService_1.name);
    }
    async scheduleAutoDebit(cycle) {
        this.logger.log(`Scheduling auto-debit for cycle ${cycle.id}`);
        return this.queue.scheduleAutoDebit(cycle);
    }
    async enqueueRetryFailed(cycleId) {
        this.logger.log(`Enqueue retry-failed-payments for cycle ${cycleId}`);
        return this.queue.addPaymentJob('retry-failed-payments', { cycleId }, { jobId: `retry_failed_${cycleId}` });
    }
};
exports.PaymentQueueService = PaymentQueueService;
exports.PaymentQueueService = PaymentQueueService = PaymentQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [queue_service_1.QueueService])
], PaymentQueueService);
//# sourceMappingURL=payment-queue.service.js.map