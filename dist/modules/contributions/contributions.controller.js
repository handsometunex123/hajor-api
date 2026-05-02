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
exports.ContributionsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const wrap_response_1 = require("../../common/dto/wrap-response");
const contributions_service_1 = require("./contributions.service");
const create_cycle_dto_1 = require("./dto/create-cycle.dto");
const list_query_dto_1 = require("../../common/dto/list-query.dto");
const contribution_cycle_dto_1 = require("./dto/contribution-cycle.dto");
const group_contribution_status_dto_1 = require("./dto/group-contribution-status.dto");
const defaulter_list_response_dto_1 = require("./dto/defaulter-list-response.dto");
const record_payment_dto_1 = require("./dto/record-payment.dto");
const cycle_created_response_dto_1 = require("./dto/cycle-created-response.dto");
const record_payment_response_dto_1 = require("./dto/record-payment-response.dto");
const ok_response_dto_1 = require("../../common/dto/ok-response.dto");
const jwt_guard_1 = require("../auth/jwt.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let ContributionsController = class ContributionsController {
    constructor(contributions) {
        this.contributions = contributions;
    }
    async createCycle(dto) {
        try {
            const cycle = await this.contributions.createCycle({
                groupId: dto.groupId,
                cycleNumber: dto.cycleNumber,
                contributionDate: new Date(dto.contributionDate),
                payoutDate: new Date(dto.payoutDate),
            });
            return { id: cycle.id };
        }
        catch (err) {
            throw new common_1.BadRequestException((err === null || err === void 0 ? void 0 : err.message) || 'Failed to create cycle');
        }
    }
    async getCurrentCycle(id) {
        try {
            const cycle = await this.contributions.getCurrentCycle(id);
            return cycle;
        }
        catch (err) {
            throw new common_1.BadRequestException((err === null || err === void 0 ? void 0 : err.message) || 'Failed to get current cycle');
        }
    }
    async getGroupStatus(id) {
        try {
            const status = await this.contributions.getGroupContributionStatus(id);
            return status;
        }
        catch (err) {
            throw new common_1.BadRequestException((err === null || err === void 0 ? void 0 : err.message) || 'Failed to get group contribution status');
        }
    }
    async getDefaulters(id, query) {
        try {
            return await this.contributions.getDefaulters(id, { page: query.page, limit: query.limit, sortBy: query.sortBy, sortOrder: query.sortOrder });
        }
        catch (err) {
            throw new common_1.BadRequestException((err === null || err === void 0 ? void 0 : err.message) || 'Failed to get defaulters');
        }
    }
    async recordPayment(dto) {
        var _a;
        try {
            const res = await this.contributions.recordContributionPayment({
                cycleId: dto.cycleId,
                groupContributorId: dto.groupContributorId,
                reference: dto.reference,
                amount: dto.amount,
                payerWalletId: dto.payerWalletId,
            });
            return { paymentId: res.payment.id, transactionId: (_a = res.transaction) === null || _a === void 0 ? void 0 : _a.id };
        }
        catch (err) {
            throw new common_1.BadRequestException((err === null || err === void 0 ? void 0 : err.message) || 'Failed to record payment');
        }
    }
    async updateCycleStatus(id, body) {
        if (body.status !== 'COMPLETE')
            throw new common_1.BadRequestException('Only status=COMPLETE is supported');
        try {
            const cycle = await this.contributions.completeCycle(id);
            return { id: cycle.id, status: cycle.status };
        }
        catch (err) {
            throw new common_1.BadRequestException((err === null || err === void 0 ? void 0 : err.message) || 'Failed to complete cycle');
        }
    }
    async adminMarkPaid(req, id, body) {
        var _a;
        return this.contributions.adminMarkPaymentPaid(id, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id, body.reason);
    }
    async retryFailed(id) {
        return this.contributions.enqueueRetryFailed(id);
    }
    async waiveLateFee(req, id, body) {
        var _a;
        return this.contributions.waiveLateFee(id, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id, body.reason);
    }
};
exports.ContributionsController = ContributionsController;
__decorate([
    (0, common_1.Post)('cycles'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a contribution cycle (admin only)', description: 'Cycles are normally created automatically when a group starts. This endpoint allows a SUPER_ADMIN to create cycles manually.' }),
    (0, swagger_1.ApiBody)({ type: create_cycle_dto_1.CreateCycleDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Cycle created', type: (0, wrap_response_1.wrapResponse)(cycle_created_response_dto_1.CycleCreatedResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cycle_dto_1.CreateCycleDto]),
    __metadata("design:returntype", Promise)
], ContributionsController.prototype, "createCycle", null);
__decorate([
    (0, common_1.Get)('groups/:id/cycles/current'),
    (0, swagger_1.ApiOperation)({ summary: 'Get the current contribution cycle for a group' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Current cycle details', type: (0, wrap_response_1.wrapResponse)(contribution_cycle_dto_1.ContributionCycleDto) }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ContributionsController.prototype, "getCurrentCycle", null);
__decorate([
    (0, common_1.Get)('groups/:id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get contribution status for a group' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group contribution status', type: (0, wrap_response_1.wrapResponse)(group_contribution_status_dto_1.GroupContributionStatusDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ContributionsController.prototype, "getGroupStatus", null);
__decorate([
    (0, common_1.Get)('cycles/:id/defaulters'),
    (0, swagger_1.ApiOperation)({ summary: 'List defaulters for a cycle' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of defaulters', type: (0, wrap_response_1.wrapResponse)(defaulter_list_response_dto_1.DefaulterListResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, list_query_dto_1.ListQueryDto]),
    __metadata("design:returntype", Promise)
], ContributionsController.prototype, "getDefaulters", null);
__decorate([
    (0, common_1.Post)('payments'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Record a contribution payment (admin only)', description: 'Payments are normally processed automatically via auto-debit. This endpoint allows a SUPER_ADMIN to record payments manually.' }),
    (0, swagger_1.ApiBody)({ type: record_payment_dto_1.RecordPaymentDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment recorded', type: (0, wrap_response_1.wrapResponse)(record_payment_response_dto_1.RecordPaymentResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [record_payment_dto_1.RecordPaymentDto]),
    __metadata("design:returntype", Promise)
], ContributionsController.prototype, "recordPayment", null);
__decorate([
    (0, common_1.Patch)('cycles/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Update cycle status (admin only)', description: 'Mark a cycle as complete. Normally handled automatically by the system.' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { status: { type: 'string', enum: ['COMPLETE'] } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Cycle updated', type: (0, wrap_response_1.wrapResponse)(contribution_cycle_dto_1.ContributionCycleDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ContributionsController.prototype, "updateCycleStatus", null);
__decorate([
    (0, common_1.Patch)('payments/:id/mark-paid'),
    (0, swagger_1.ApiOperation)({ summary: 'Admin override: mark a FAILED payment as PAID', description: 'Used when a defaulter has been covered by the admin or paid outside the system. Marks the payment PAID and triggers cycle completion check.' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiBody)({ schema: { properties: { reason: { type: 'string', example: 'Admin covered defaulter' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment marked as paid', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ContributionsController.prototype, "adminMarkPaid", null);
__decorate([
    (0, common_1.Post)('cycles/:id/retry-failed'),
    (0, swagger_1.ApiOperation)({ summary: 'Re-enqueue retry job for failed payments in a cycle', description: 'Admin triggers another auto-debit attempt for all FAILED payments in a cycle.' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Retry job enqueued', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ContributionsController.prototype, "retryFailed", null);
__decorate([
    (0, common_1.Patch)('payments/:id/waive-late-fee'),
    (0, swagger_1.ApiOperation)({ summary: 'Waive a late fee charged on a payment', description: 'Reverses the late fee double-entry transaction, refunding the user.' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiBody)({ schema: { properties: { reason: { type: 'string', example: 'Compassionate waiver' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Late fee waived', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ContributionsController.prototype, "waiveLateFee", null);
exports.ContributionsController = ContributionsController = __decorate([
    (0, swagger_1.ApiTags)('Contributions'),
    (0, common_1.Controller)('contributions'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [contributions_service_1.ContributionsService])
], ContributionsController);
//# sourceMappingURL=contributions.controller.js.map