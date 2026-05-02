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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const express_1 = require("express");
const withdraw_dto_1 = require("./withdraw.dto");
const withdraw_service_1 = require("./withdraw.service");
const jwt_guard_1 = require("../auth/jwt.guard");
const swagger_1 = require("@nestjs/swagger");
const wrap_response_1 = require("../../common/dto/wrap-response");
const processed_response_dto_1 = require("../../common/dto/processed-response.dto");
const ok_response_dto_1 = require("../../common/dto/ok-response.dto");
let WithdrawController = class WithdrawController {
    constructor(service) {
        this.service = service;
    }
    async create(req, dto) {
        const user = req.user;
        if (!user || !user.id)
            throw new common_1.BadRequestException('Unauthenticated');
        return this.service.requestWithdraw(user.id, dto.amount, dto.recipient, dto.transactionPin, dto.note);
    }
    async confirm(req, txId, body) {
        const user = req.user;
        if (!user || !user.id)
            throw new common_1.BadRequestException('Unauthenticated');
        return this.service.confirmWithdraw(user.id, txId, body.otp);
    }
};
exports.WithdrawController = WithdrawController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Request a withdraw' }),
    (0, swagger_1.ApiBody)({ type: withdraw_dto_1.CreateWithdrawDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Withdraw requested', type: (0, wrap_response_1.wrapResponse)(processed_response_dto_1.ProcessedResponseDto) }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_a = typeof express_1.Request !== "undefined" && express_1.Request) === "function" ? _a : Object, withdraw_dto_1.CreateWithdrawDto]),
    __metadata("design:returntype", Promise)
], WithdrawController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':txId/confirmation'),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm withdrawal with OTP' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { otp: { type: 'string', example: '123456' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Withdrawal confirmed or failed', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('txId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof express_1.Request !== "undefined" && express_1.Request) === "function" ? _b : Object, String, Object]),
    __metadata("design:returntype", Promise)
], WithdrawController.prototype, "confirm", null);
exports.WithdrawController = WithdrawController = __decorate([
    (0, swagger_1.ApiTags)('Withdrawals'),
    (0, common_1.Controller)('withdrawals'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [withdraw_service_1.WithdrawService])
], WithdrawController);
//# sourceMappingURL=withdraw.controller.js.map