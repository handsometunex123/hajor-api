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
exports.DisputesController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const wrap_response_1 = require("../../common/dto/wrap-response");
const jwt_guard_1 = require("../auth/jwt.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const disputes_service_1 = require("./disputes.service");
const create_dispute_dto_1 = require("./dto/create-dispute.dto");
const resolve_dispute_dto_1 = require("./dto/resolve-dispute.dto");
const list_query_dto_1 = require("../../common/dto/list-query.dto");
const dispute_response_dto_1 = require("./dto/dispute-response.dto");
let DisputesController = class DisputesController {
    constructor(disputes) {
        this.disputes = disputes;
    }
    async create(dto) {
        try {
            const d = await this.disputes.createDispute(dto);
            return { id: d.id, status: d.status };
        }
        catch (err) {
            throw new common_1.BadRequestException((err === null || err === void 0 ? void 0 : err.message) || 'Failed to create dispute');
        }
    }
    async list(userId, status, type, query) {
        try {
            return await this.disputes.listByUser(userId, { page: query.page, limit: query.limit, status, type, sortBy: query.sortBy, sortOrder: query.sortOrder });
        }
        catch (err) {
            throw new common_1.BadRequestException((err === null || err === void 0 ? void 0 : err.message) || 'Failed to list disputes');
        }
    }
    async resolve(req, id, dto) {
        var _a;
        return this.disputes.resolveDispute(id, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id, dto);
    }
};
exports.DisputesController = DisputesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a dispute' }),
    (0, swagger_1.ApiBody)({ type: create_dispute_dto_1.CreateDisputeDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Dispute created', type: (0, wrap_response_1.wrapResponse)(dispute_response_dto_1.DisputeResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_dispute_dto_1.CreateDisputeDto]),
    __metadata("design:returntype", Promise)
], DisputesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List disputes (filter by userId query param)' }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false, type: String, description: 'Filter disputes by user ID' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, type: String, description: 'Filter by status (OPEN, RESOLVED, etc.)' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, type: String, description: 'Filter by dispute type' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of disputes', type: (0, wrap_response_1.wrapArrayResponse)(dispute_response_dto_1.DisputeResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, list_query_dto_1.ListQueryDto]),
    __metadata("design:returntype", Promise)
], DisputesController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Resolve or update a dispute (SUPER_ADMIN only)', description: 'Transition dispute to INVESTIGATING, RESOLVED, or REJECTED.' }),
    (0, swagger_1.ApiBody)({ type: resolve_dispute_dto_1.ResolveDisputeDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Dispute updated', type: (0, wrap_response_1.wrapResponse)(dispute_response_dto_1.DisputeResponseDto) }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, resolve_dispute_dto_1.ResolveDisputeDto]),
    __metadata("design:returntype", Promise)
], DisputesController.prototype, "resolve", null);
exports.DisputesController = DisputesController = __decorate([
    (0, swagger_1.ApiTags)('Disputes'),
    (0, common_1.Controller)('disputes'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [disputes_service_1.DisputesService])
], DisputesController);
//# sourceMappingURL=disputes.controller.js.map