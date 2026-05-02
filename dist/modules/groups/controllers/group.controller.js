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
exports.GroupController = void 0;
const openapi = require("@nestjs/swagger");
const platform_legal_1 = require("../../../common/platform-legal");
const enums_1 = require("../../../common/enums");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_guard_1 = require("../../auth/jwt.guard");
const roles_guard_1 = require("../../../common/guards/roles.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const group_service_1 = require("../group.service");
const group_lifecycle_service_1 = require("../group-lifecycle.service");
const create_group_dto_1 = require("../dto/create-group.dto");
const update_group_dto_1 = require("../dto/update-group.dto");
const group_created_response_dto_1 = require("../dto/group-created-response.dto");
const group_details_response_dto_1 = require("../dto/group-details-response.dto");
const my_group_status_response_dto_1 = require("../dto/my-group-status-response.dto");
const ok_response_dto_1 = require("../../../common/dto/ok-response.dto");
const swagger_1 = require("@nestjs/swagger");
const wrap_response_1 = require("../../../common/dto/wrap-response");
const group_feed_response_dto_1 = require("../dto/group-feed-response.dto");
const list_query_dto_1 = require("../../../common/dto/list-query.dto");
let GroupController = class GroupController {
    constructor(groupService, lifecycle, config) {
        this.groupService = groupService;
        this.lifecycle = lifecycle;
        this.config = config;
    }
    getPlatformIndemnity() {
        return { indemnity: platform_legal_1.PLATFORM_INDEMNITY_TEXT };
    }
    getPlatformTerms() {
        return { terms: platform_legal_1.PLATFORM_TERMS_TEXT };
    }
    async create(req, dto) {
        var _a;
        const actorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        await this.groupService.assertKycVerified(actorId);
        await this.groupService.assertWalletProvisioned(actorId);
        const ipAddress = req.ip || 'unknown';
        const groupDto = {
            name: dto.name,
            description: dto.description,
            maxSlots: dto.maxSlots,
            contributionAmount: dto.contributionAmount,
            frequency: dto.frequency in enums_1.Frequency ? dto.frequency : dto.frequency,
            serviceCharge: dto.serviceCharge,
            lateFee: dto.lateFee,
            gracePeriodDays: dto.gracePeriodDays,
            adminIndemnityAccepted: dto.adminIndemnityAccepted,
        };
        const result = await this.groupService.createGroup(actorId, groupDto, ipAddress);
        const frontend = (this.config.get('FRONTEND_URL') || 'https://app.example.com').replace(/\/+$/, '');
        const url = `${frontend}/join/${result.joinToken}`;
        return { group: result.group, joinUrl: url, token: result.joinToken };
    }
    async get(id) {
        return this.groupService.getGroupDetails(id);
    }
    async myContributors(req, id) {
        var _a;
        return this.groupService.getMyStatus(id, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
    }
    async getRandomGroups(req, limit) {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const maxLimit = limit && limit > 0 && limit <= 10 ? limit : 5;
        const groups = await this.groupService.getRandomJoinableGroups(userId, maxLimit);
        return { data: groups };
    }
    async feed(req, id, query) {
        var _a;
        await this.groupService.assertGroupContributorOrAdmin((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, id);
        return this.groupService.getGroupFeed(id, { page: query.page, limit: query.limit, search: query.search, sortBy: query.sortBy, sortOrder: query.sortOrder });
    }
    async startGroup(req, id, body) {
        var _a;
        const actorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        await this.groupService.assertKycVerified(actorId);
        await this.groupService.assertWalletProvisioned(actorId);
        const firstContributionDate = body.firstContributionDate ? new Date(body.firstContributionDate) : undefined;
        return this.lifecycle.startGroup(actorId, id, { firstContributionDate });
    }
    async update(req, id, dto) {
        var _a;
        const updateDto = dto.frequency && Object.values(enums_1.Frequency).includes(dto.frequency)
            ? { ...dto, frequency: dto.frequency }
            : dto;
        if ('terms' in updateDto) {
            delete updateDto.terms;
        }
        return this.groupService.updateGroup((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, id, updateDto);
    }
    async freeze(req, id, body) {
        var _a;
        if (!body.reason)
            throw new common_1.BadRequestException('Reason is required');
        await this.groupService.freezeGroup((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, id, body.reason);
        return { ok: true };
    }
    async delete(req, id, body) {
        var _a;
        return this.groupService.deleteGroup((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, id, body.reason);
    }
    async forcePayout(req, id, cycleId) {
        var _a;
        return this.lifecycle.forcePayoutCycle((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, id, cycleId);
    }
    async rescheduleCycle(req, id, cycleId, body) {
        var _a, _b;
        if (!body.contributionDate)
            throw new common_1.BadRequestException('contributionDate is required');
        if (!((_a = body.reason) === null || _a === void 0 ? void 0 : _a.trim()))
            throw new common_1.BadRequestException('reason is required');
        return this.lifecycle.rescheduleCycle((_b = req.user) === null || _b === void 0 ? void 0 : _b.id, id, cycleId, new Date(body.contributionDate), body.reason.trim());
    }
    async requestReschedule(req, id, cycleId, body) {
        var _a, _b;
        if (!body.requestedDate)
            throw new common_1.BadRequestException('requestedDate is required');
        if (!((_a = body.reason) === null || _a === void 0 ? void 0 : _a.trim()))
            throw new common_1.BadRequestException('reason is required');
        return this.lifecycle.requestCycleReschedule((_b = req.user) === null || _b === void 0 ? void 0 : _b.id, id, cycleId, new Date(body.requestedDate), body.reason.trim());
    }
    async approveCycleReschedule(req, ticketId) {
        var _a;
        return this.lifecycle.approveCycleReschedule((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, ticketId);
    }
    async rejectCycleReschedule(req, ticketId, body) {
        var _a, _b;
        return this.lifecycle.rejectCycleReschedule((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, ticketId, (_b = body.notes) === null || _b === void 0 ? void 0 : _b.trim());
    }
    async settle(req, id) {
        var _a;
        return this.groupService.settleGroup((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, id);
    }
    async unfreeze(req, id) {
        var _a;
        await this.groupService.unfreezeGroup((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, id);
        return { ok: true };
    }
};
exports.GroupController = GroupController;
__decorate([
    (0, common_1.Get)('platform-indemnity'),
    (0, swagger_1.ApiOperation)({ summary: 'Get platform-wide indemnity text for group admins' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Platform indemnity text', schema: { type: 'object', properties: { indemnity: { type: 'string' } } } }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "getPlatformIndemnity", null);
__decorate([
    (0, common_1.Get)('platform-terms'),
    (0, swagger_1.ApiOperation)({ summary: 'Get platform-wide group terms for contributors' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Platform group terms', schema: { type: 'object', properties: { terms: { type: 'string' } } } }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "getPlatformTerms", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new group' }),
    (0, swagger_1.ApiBody)({ type: create_group_dto_1.CreateGroupDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group created', type: (0, wrap_response_1.wrapResponse)(group_created_response_dto_1.GroupCreatedResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_group_dto_1.CreateGroupDto]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get group details' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group details', type: (0, wrap_response_1.wrapResponse)(group_details_response_dto_1.GroupDetailsResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "get", null);
__decorate([
    (0, common_1.Get)(':id/my-contributors'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user\'s contributor slots in a group', description: 'Returns the calling user\'s contributor records in the group, whether terms acceptance is required, and whether they have accepted.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User\'s contributor slots', type: (0, wrap_response_1.wrapResponse)(my_group_status_response_dto_1.MyGroupStatusResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "myContributors", null);
__decorate([
    (0, common_1.Get)('discover/random'),
    (0, swagger_1.ApiOperation)({ summary: 'Get random joinable groups for discovery (top 5)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Max groups to return (1-10, default 5)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Random joinable groups', schema: { type: 'array', items: { type: 'object' } } }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "getRandomGroups", null);
__decorate([
    (0, common_1.Get)(':id/feed'),
    (0, swagger_1.ApiOperation)({ summary: 'Get group feed (audit log) for a group', description: 'Only accessible to group contributors and the group admin.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group feed', type: (0, wrap_response_1.wrapResponse)(group_feed_response_dto_1.GroupFeedResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, list_query_dto_1.ListQueryDto]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "feed", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    (0, swagger_1.ApiOperation)({ summary: 'Start a group (begin contributions)' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { firstContributionDate: { type: 'string', format: 'date-time', description: 'ISO date for when the first contribution is due (defaults to now if omitted)', example: '2026-05-01T00:00:00.000Z' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group started', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "startGroup", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a group', description: 'Name, description, and terms can be updated anytime. Core fields (contributionAmount, frequency, maxSlots, serviceCharge, lateFee) can only be updated before the group starts.' }),
    (0, swagger_1.ApiBody)({ type: update_group_dto_1.UpdateGroupDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group updated', type: (0, wrap_response_1.wrapResponse)(group_details_response_dto_1.GroupDetailsResponseDto) }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_group_dto_1.UpdateGroupDto]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/freeze'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Freeze a group (SUPER_ADMIN only)', description: 'Prevents all mutations on the group until unfrozen.' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { reason: { type: 'string', example: 'Under investigation for fraud' } }, required: ['reason'] } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group frozen', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "freeze", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a NOT_STARTED group (admin only)', description: 'Deletes a NOT_STARTED group and all contributors. Hard delete — no audit trail needed.' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { reason: { type: 'string', example: 'No longer needed' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group deleted', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/cycles/:cycleId/payout'),
    (0, swagger_1.ApiOperation)({ summary: 'Force payout for a cycle (group admin only)', description: 'Marks remaining unpaid/failed contributions as DEFAULTED, completes the cycle, and enqueues the payout. Use after the grace period when some contributors have not paid.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payout enqueued', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('cycleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "forcePayout", null);
__decorate([
    (0, common_1.Patch)(':id/cycles/:cycleId/reschedule'),
    (0, swagger_1.ApiOperation)({ summary: 'Reschedule a PENDING cycle (group admin, no approval needed)', description: 'Directly reschedules a cycle that has not yet started collecting. New date must be in the future, later than the current date, and within one frequency interval. Cascades to all subsequent PENDING cycles. For a COLLECTING cycle, use the reschedule-request endpoint instead.' }),
    (0, swagger_1.ApiBody)({ schema: { required: ['contributionDate', 'reason'], properties: { contributionDate: { type: 'string', format: 'date-time', example: '2026-06-01T09:00:00.000Z' }, reason: { type: 'string', example: 'Public holiday — banks will be closed' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Cycle rescheduled', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('cycleId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "rescheduleCycle", null);
__decorate([
    (0, common_1.Post)(':id/cycles/:cycleId/reschedule-request'),
    (0, swagger_1.ApiOperation)({ summary: 'Request a cycle reschedule for a COLLECTING cycle (requires super admin approval)', description: 'Raises a CYCLE_RESCHEDULE ticket when the cycle is already collecting contributions. Super admin must approve before any date changes take effect. For a PENDING cycle, use PATCH /groups/:id/cycles/:cycleId/reschedule instead.' }),
    (0, swagger_1.ApiBody)({ schema: { required: ['requestedDate', 'reason'], properties: { requestedDate: { type: 'string', format: 'date-time', example: '2026-06-01T09:00:00.000Z' }, reason: { type: 'string', example: 'Public holiday — banks will be closed' } } } }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Reschedule request submitted for super admin approval', schema: { type: 'object', properties: { ok: { type: 'boolean' }, ticketId: { type: 'string' }, message: { type: 'string' } } } }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('cycleId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "requestReschedule", null);
__decorate([
    (0, common_1.Post)('reschedule-requests/:ticketId/approve'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve a cycle reschedule request (SUPER_ADMIN only)', description: 'Executes the cascade reschedule: shifts the target cycle and all subsequent PENDING cycles by the same delta, cancels and reschedules BullMQ jobs, then notifies contributors.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reschedule approved and executed', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('ticketId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "approveCycleReschedule", null);
__decorate([
    (0, common_1.Post)('reschedule-requests/:ticketId/reject'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Reject a cycle reschedule request (SUPER_ADMIN only)' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { notes: { type: 'string', example: 'Dates cannot be changed this close to the contribution day.' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reschedule request rejected', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('ticketId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "rejectCycleReschedule", null);
__decorate([
    (0, common_1.Post)(':id/settle'),
    (0, swagger_1.ApiOperation)({ summary: 'Settle a completed group (admin only)', description: 'Transfers remaining group wallet balance (late fees, etc.) to admin wallet and archives the group.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group settled', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "settle", null);
__decorate([
    (0, common_1.Post)(':id/unfreeze'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Unfreeze a group (SUPER_ADMIN only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group unfrozen', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GroupController.prototype, "unfreeze", null);
exports.GroupController = GroupController = __decorate([
    (0, swagger_1.ApiTags)('Groups'),
    (0, common_1.Controller)('groups'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [group_service_1.GroupService, group_lifecycle_service_1.GroupLifecycleService, config_1.ConfigService])
], GroupController);
//# sourceMappingURL=group.controller.js.map