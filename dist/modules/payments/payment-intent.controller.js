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
exports.PaymentIntentController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const payment_intent_dto_1 = require("./payment-intent.dto");
const payment_intent_service_1 = require("./payment-intent.service");
const swagger_1 = require("@nestjs/swagger");
const wrap_response_1 = require("../../common/dto/wrap-response");
const jwt_guard_1 = require("../auth/jwt.guard");
const payment_intent_response_dto_1 = require("./dto/payment-intent-response.dto");
let PaymentIntentController = class PaymentIntentController {
    constructor(service) {
        this.service = service;
    }
    async create(dto) {
        return this.service.createIntent(dto.cycleId, dto.groupContributorId, dto.email, dto.callbackUrl);
    }
};
exports.PaymentIntentController = PaymentIntentController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a payment intent to begin checkout' }),
    (0, swagger_1.ApiBody)({ type: payment_intent_dto_1.CreatePaymentIntentDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment intent created', type: (0, wrap_response_1.wrapResponse)(payment_intent_response_dto_1.PaymentIntentResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_intent_dto_1.CreatePaymentIntentDto]),
    __metadata("design:returntype", Promise)
], PaymentIntentController.prototype, "create", null);
exports.PaymentIntentController = PaymentIntentController = __decorate([
    (0, swagger_1.ApiTags)('Payments'),
    (0, common_1.Controller)('payments/intents'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [payment_intent_service_1.PaymentIntentService])
], PaymentIntentController);
//# sourceMappingURL=payment-intent.controller.js.map