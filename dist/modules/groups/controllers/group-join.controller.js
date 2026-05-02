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
exports.GroupJoinController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../auth/jwt.guard");
const group_join_service_1 = require("../group-join.service");
const swagger_1 = require("@nestjs/swagger");
const wrap_response_1 = require("../../../common/dto/wrap-response");
const id_response_dto_1 = require("../../../common/dto/id-response.dto");
const ok_response_dto_1 = require("../../../common/dto/ok-response.dto");
let GroupJoinController = class GroupJoinController {
    constructor(svc) {
        this.svc = svc;
    }
    async list(req, groupId, query) {
        var _a;
        const actorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const items = await this.svc.listJoinRequests(actorId, groupId, query.status);
        return { items };
    }
    async request(req, groupId, body) {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.svc.requestToJoin(userId, groupId, body.acceptTerms);
    }
    async updateStatus(req, groupId, requestId, body) {
        var _a;
        const actorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (body.status === 'APPROVED')
            return this.svc.approveJoinRequest(actorId, requestId, body.acceptIndemnity === true);
        if (body.status === 'REJECTED')
            return this.svc.rejectJoinRequest(actorId, requestId);
        throw new common_1.BadRequestException('status must be APPROVED or REJECTED');
    }
};
exports.GroupJoinController = GroupJoinController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List join requests for a group (admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'groupId', description: 'The group ID' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, type: String, description: 'Filter by status (PENDING, APPROVED, REJECTED)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of join requests', type: (0, wrap_response_1.wrapArrayResponse)(id_response_dto_1.IdResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], GroupJoinController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Request to join a group' }),
    (0, swagger_1.ApiParam)({ name: 'groupId', description: 'The group ID' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { acceptTerms: { type: 'boolean', description: 'User must accept group terms and conditions' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Join request created', type: (0, wrap_response_1.wrapResponse)(id_response_dto_1.IdResponseDto) }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], GroupJoinController.prototype, "request", null);
__decorate([
    (0, common_1.Patch)(':requestId'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve or reject a join request' }),
    (0, swagger_1.ApiParam)({ name: 'groupId', description: 'The group ID' }),
    (0, swagger_1.ApiParam)({ name: 'requestId', description: 'The join request ID' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { status: { type: 'string', enum: ['APPROVED', 'REJECTED'] }, acceptIndemnity: { type: 'boolean', description: 'Admin must accept indemnity for the user' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Join request updated', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Param)('requestId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], GroupJoinController.prototype, "updateStatus", null);
exports.GroupJoinController = GroupJoinController = __decorate([
    (0, swagger_1.ApiTags)('Groups'),
    (0, common_1.Controller)('groups/:groupId/join-requests'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [group_join_service_1.GroupJoinService])
], GroupJoinController);
//# sourceMappingURL=group-join.controller.js.map