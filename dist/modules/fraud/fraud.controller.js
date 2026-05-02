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
exports.FraudController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const swagger_2 = require("@nestjs/swagger");
const wrap_response_1 = require("../../common/dto/wrap-response");
const fraud_service_1 = require("./fraud.service");
const list_query_dto_1 = require("../../common/dto/list-query.dto");
const jwt_guard_1 = require("../auth/jwt.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const review_flag_dto_1 = require("./dto/review-flag.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const fraud_flag_response_dto_1 = require("./dto/fraud-flag-response.dto");
const paginated_fraud_flags_response_dto_1 = require("./dto/paginated-fraud-flags-response.dto");
let FraudController = class FraudController {
    constructor(fraud) {
        this.fraud = fraud;
    }
    async listFlags(query) {
        const opts = {};
        if (query.page)
            opts.page = query.page;
        if (query.limit)
            opts.limit = query.limit;
        if (query.search)
            opts.status = query.search;
        if (query.sortBy)
            opts.sortBy = query.sortBy;
        if (query.sortOrder)
            opts.sortOrder = query.sortOrder;
        return this.fraud.listFlags(opts);
    }
    async reviewFlag(id, dto, user) {
        var _a;
        try {
            const status = (_a = dto.status) !== null && _a !== void 0 ? _a : 'REVIEWED';
            const updated = await this.fraud.reviewFlag(id, user.id, status, dto.metadata);
            return updated;
        }
        catch (err) {
            throw new common_1.BadRequestException((err === null || err === void 0 ? void 0 : err.message) || 'Failed to review flag');
        }
    }
};
exports.FraudController = FraudController;
__decorate([
    (0, common_1.Get)('flags'),
    (0, swagger_2.ApiOperation)({ summary: 'List fraud flags (admin)' }),
    (0, swagger_2.ApiResponse)({ status: 200, description: 'List of fraud flags', type: (0, wrap_response_1.wrapResponse)(paginated_fraud_flags_response_dto_1.PaginatedFraudFlagsResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_query_dto_1.ListQueryDto]),
    __metadata("design:returntype", Promise)
], FraudController.prototype, "listFlags", null);
__decorate([
    (0, common_1.Patch)('flags/:id'),
    (0, swagger_2.ApiOperation)({ summary: 'Review a fraud flag (admin)' }),
    (0, swagger_2.ApiBody)({ type: review_flag_dto_1.ReviewFlagDto }),
    (0, swagger_2.ApiResponse)({ status: 200, description: 'Flag reviewed', type: (0, wrap_response_1.wrapResponse)(fraud_flag_response_dto_1.FraudFlagResponseDto) }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, review_flag_dto_1.ReviewFlagDto, Object]),
    __metadata("design:returntype", Promise)
], FraudController.prototype, "reviewFlag", null);
exports.FraudController = FraudController = __decorate([
    (0, swagger_1.ApiTags)('Fraud'),
    (0, common_1.Controller)('fraud'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [fraud_service_1.FraudService])
], FraudController);
//# sourceMappingURL=fraud.controller.js.map