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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const wrap_response_1 = require("../../common/dto/wrap-response");
const payouts_service_1 = require("./payouts.service");
const jwt_guard_1 = require("../auth/jwt.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const execute_payout_dto_1 = require("./dto/execute-payout.dto");
const payout_response_dto_1 = require("./dto/payout-response.dto");
const queue_service_1 = require("../../infrastructure/queue/queue.service");
let PayoutsController = class PayoutsController {
    constructor(payouts, queue) {
        this.payouts = payouts;
        this.queue = queue;
    }
    async execute(body) {
        try {
            const res = await this.payouts.executeCyclePayout(body.cycleId);
            return { ok: !!res };
        }
        catch (err) {
            throw new common_1.BadRequestException((err === null || err === void 0 ? void 0 : err.message) || 'Payout execution failed');
        }
    }
    async retry(body) {
        await this.queue.addPayoutJob('process-payout', { cycleId: body.cycleId }, { jobId: `retry_payout_${body.cycleId}_${Date.now()}` });
        return { ok: true, message: 'Payout job enqueued' };
    }
    async triggerReconciliation() {
        await this.queue.triggerReconciliation();
        return { ok: true, message: 'Reconciliation job enqueued' };
    }
};
exports.PayoutsController = PayoutsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Execute payout for a cycle (sync)' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiBody)({ type: execute_payout_dto_1.ExecutePayoutDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payout executed', type: (0, wrap_response_1.wrapResponse)(payout_response_dto_1.PayoutResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [execute_payout_dto_1.ExecutePayoutDto]),
    __metadata("design:returntype", Promise)
], PayoutsController.prototype, "execute", null);
__decorate([
    (0, common_1.Post)('retry'),
    (0, swagger_1.ApiOperation)({ summary: 'Re-enqueue a payout job for a cycle (async via worker)', description: 'Use when a payout job failed after all automatic retries. Enqueues a new payout job for the given cycle.' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiBody)({ type: execute_payout_dto_1.ExecutePayoutDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payout job re-enqueued' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [execute_payout_dto_1.ExecutePayoutDto]),
    __metadata("design:returntype", Promise)
], PayoutsController.prototype, "retry", null);
__decorate([
    (0, common_1.Post)('reconcile'),
    (0, swagger_1.ApiOperation)({ summary: 'Trigger a reconciliation run (SUPER_ADMIN only)', description: 'Enqueues a one-off Paystack reconciliation job for the reconciliation worker.' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reconciliation job enqueued' }),
    openapi.ApiResponse({ status: 201 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PayoutsController.prototype, "triggerReconciliation", null);
exports.PayoutsController = PayoutsController = __decorate([
    (0, swagger_1.ApiTags)('Payouts'),
    (0, common_1.Controller)('payouts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [payouts_service_1.PayoutsService, queue_service_1.QueueService])
], PayoutsController);
//# sourceMappingURL=payouts.controller.js.map