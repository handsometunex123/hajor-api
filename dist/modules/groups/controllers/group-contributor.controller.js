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
exports.ContributorSwapController = exports.GroupContributorController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../auth/jwt.guard");
const group_contributor_service_1 = require("../group-contributor.service");
const contributor_swap_service_1 = require("../contributor-swap.service");
const swap_payout_dto_1 = require("../dto/swap-payout.dto");
const id_response_dto_1 = require("../../../common/dto/id-response.dto");
const ok_response_dto_1 = require("../../../common/dto/ok-response.dto");
const list_query_dto_1 = require("../../../common/dto/list-query.dto");
const swagger_1 = require("@nestjs/swagger");
const wrap_response_1 = require("../../../common/dto/wrap-response");
const contributor_list_response_dto_1 = require("../dto/contributor-list-response.dto");
const group_service_1 = require("../group.service");
let GroupContributorController = class GroupContributorController {
    constructor(svc, swapSvc, groupService) {
        this.svc = svc;
        this.swapSvc = swapSvc;
        this.groupService = groupService;
    }
    async list(req, groupId, query) {
        var _a;
        await this.groupService.assertGroupContributorOrAdmin((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, groupId);
        return this.svc.listContributors(groupId, {
            page: query.page,
            limit: query.limit,
            search: query.search,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
        });
    }
    async addSelf(req, groupId) {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.svc.addSelfSlot(userId, groupId);
    }
    async remove(req, groupId, contributorId) {
        var _a;
        const actorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.svc.removeContributor(actorId, groupId, contributorId);
    }
    async swap(req, groupId, dto) {
        var _a;
        const actorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.swapSvc.swap(actorId, groupId, dto.contributorAId, dto.contributorBId);
    }
    async acceptTerms(req, groupId, contributorId) {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.svc.acceptTerms(userId, groupId, contributorId);
    }
    async nudgeTerms(req, groupId) {
        var _a;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.svc.nudgeTerms(adminId, groupId);
    }
};
exports.GroupContributorController = GroupContributorController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all contributors in a group', description: 'Returns contributors with their user details, displayId and payout order. Supports pagination, sorting (joinedAt, payoutOrder) and search by displayId, name or email.' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false, type: String, description: 'Filter by displayId (contributor code), first name, last name or email' }),
    (0, swagger_1.ApiQuery)({ name: 'sortBy', required: false, enum: ['joinedAt', 'payoutOrder'] }),
    (0, swagger_1.ApiQuery)({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    (0, swagger_1.ApiQuery)({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated list of group contributors.', type: (0, wrap_response_1.wrapResponse)(contributor_list_response_dto_1.ContributorListResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, list_query_dto_1.ListQueryDto]),
    __metadata("design:returntype", Promise)
], GroupContributorController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Add yourself as a contributor in a group', description: 'Adds the authenticated user as a contributor (up to 2 slots). Group admins use this to join their own group. Existing contributors use it to claim a second slot. Group must be NOT_STARTED and have free slots.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Contributor slot added', type: (0, wrap_response_1.wrapResponse)(id_response_dto_1.IdResponseDto) }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GroupContributorController.prototype, "addSelf", null);
__decorate([
    (0, common_1.Delete)(':contributorId'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a contributor from group' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Contributor removed', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Param)('contributorId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], GroupContributorController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)('payout-order'),
    (0, swagger_1.ApiOperation)({
        summary: 'Swap payout order between two contributors',
        description: 'Admin-only. If the group is NOT_STARTED the swap is applied immediately. If the group is STARTED a swap request is created and both contributors must approve before the swap is executed.',
    }),
    (0, swagger_1.ApiBody)({ type: swap_payout_dto_1.SwapPayoutDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payout order updated or swap request created', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, swap_payout_dto_1.SwapPayoutDto]),
    __metadata("design:returntype", Promise)
], GroupContributorController.prototype, "swap", null);
__decorate([
    (0, common_1.Post)(':contributorId/terms-acceptance'),
    (0, swagger_1.ApiOperation)({ summary: 'Accept group terms for a contributor slot', description: 'Contributors must accept the group terms before the group can start. Admin slots are auto-accepted.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Terms accepted', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Param)('contributorId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], GroupContributorController.prototype, "acceptTerms", null);
__decorate([
    (0, common_1.Post)('terms-nudges'),
    (0, swagger_1.ApiOperation)({ summary: 'Send terms acceptance reminders', description: 'Admin-only. Sends a notification to every contributor who has not yet accepted the group terms.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Nudge results', schema: { properties: { sent: { type: 'number' }, total: { type: 'number' } } } }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GroupContributorController.prototype, "nudgeTerms", null);
exports.GroupContributorController = GroupContributorController = __decorate([
    (0, swagger_1.ApiTags)('Groups'),
    (0, common_1.Controller)('groups/:groupId/contributors'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [group_contributor_service_1.GroupContributorService,
        contributor_swap_service_1.ContributorSwapService,
        group_service_1.GroupService])
], GroupContributorController);
let ContributorSwapController = class ContributorSwapController {
    constructor(swapSvc) {
        this.swapSvc = swapSvc;
    }
    async list(req, groupId, status) {
        var _a;
        return this.swapSvc.listSwapRequests((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, groupId, status);
    }
    async approve(req, groupId, requestId) {
        var _a;
        return this.swapSvc.approveSwapRequest((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, groupId, requestId);
    }
    async reject(req, groupId, requestId) {
        var _a;
        return this.swapSvc.rejectSwapRequest((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, groupId, requestId);
    }
    async cancel(req, groupId, requestId) {
        var _a;
        return this.swapSvc.cancelSwapRequest((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, groupId, requestId);
    }
};
exports.ContributorSwapController = ContributorSwapController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List swap requests for a group', description: 'Admin-only. Returns all swap requests with contributor and user details.' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], description: 'Filter by swap request status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of swap requests' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ContributorSwapController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(':requestId/approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve a swap request', description: 'Called by one of the two contributors involved in the swap. When both have approved the swap is executed automatically.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Approval recorded. Returns EXECUTED when both parties have approved, or AWAITING_OTHER_APPROVAL otherwise.' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Param)('requestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ContributorSwapController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':requestId/reject'),
    (0, swagger_1.ApiOperation)({ summary: 'Reject a swap request', description: 'Called by one of the two contributors involved in the swap. Marks the request as REJECTED and notifies the admin.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Swap request rejected', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Param)('requestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ContributorSwapController.prototype, "reject", null);
__decorate([
    (0, common_1.Delete)(':requestId'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel a swap request', description: 'Admin-only. Cancels a pending swap request.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Swap request cancelled', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Param)('requestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ContributorSwapController.prototype, "cancel", null);
exports.ContributorSwapController = ContributorSwapController = __decorate([
    (0, swagger_1.ApiTags)('Groups'),
    (0, common_1.Controller)('groups/:groupId/swap-requests'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [contributor_swap_service_1.ContributorSwapService])
], ContributorSwapController);
//# sourceMappingURL=group-contributor.controller.js.map