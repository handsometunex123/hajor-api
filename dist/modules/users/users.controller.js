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
exports.UsersController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const users_service_1 = require("./users.service");
const swagger_1 = require("@nestjs/swagger");
const wrap_response_1 = require("../../common/dto/wrap-response");
const onboard_invite_dto_1 = require("./dto/onboard-invite.dto");
const list_users_dto_1 = require("./dto/list-users.dto");
const paginated_users_response_dto_1 = require("./dto/paginated-users-response.dto");
const ok_response_dto_1 = require("../../common/dto/ok-response.dto");
const user_lite_dto_1 = require("./dto/user-lite.dto");
const verify_bvn_dto_1 = require("./dto/verify-bvn.dto");
const change_transaction_pin_dto_1 = require("./dto/change-transaction-pin.dto");
const reset_transaction_pin_dto_1 = require("./dto/reset-transaction-pin.dto");
const my_groups_response_dto_1 = require("../groups/dto/my-groups-response.dto");
const my_groups_query_dto_1 = require("./dto/my-groups-query.dto");
const jwt_guard_1 = require("../auth/jwt.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let UsersController = class UsersController {
    constructor(users) {
        this.users = users;
    }
    async getMe(req) {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const profile = await this.users.getProfile(userId);
        if (!profile)
            throw new common_1.NotFoundException('User not found');
        return profile;
    }
    async myGroups(user, query) {
        return this.users.getMyGroups(user.id, {
            page: query.page,
            limit: query.limit,
            search: query.search,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
            status: query.status,
            frequency: query.frequency,
            isAdmin: query.isAdmin,
        });
    }
    async myReferrals(user) {
        return this.users.getReferralStats(user.id);
    }
    async list(req, query) {
        const caller = req.user;
        const isSuperAdmin = (caller === null || caller === void 0 ? void 0 : caller.role) === 'SUPER_ADMIN';
        if (!isSuperAdmin) {
            const groupCount = await this.users.countAdminGroups(caller === null || caller === void 0 ? void 0 : caller.id);
            if (groupCount === 0)
                throw new common_1.ForbiddenException('Only group admins or super admins can list users');
        }
        return await this.users.listUsers(query, { excludeSuperAdmins: !isSuperAdmin });
    }
    async verifyBvn(req, body) {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return await this.users.validateBvnAndSet(userId, body);
    }
    async onboardInvite(userId, body) {
        return await this.users.completeInviteOnboarding(userId, body);
    }
    async upgradeProxy(req, userId) {
        var _a;
        return await this.users.upgradeProxyToUser(userId, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
    }
    async changeTransactionPin(user, body) {
        return this.users.changeTransactionPin(user.id, body.currentPin, body.newPin);
    }
    async resetTransactionPin(user, body) {
        return this.users.resetTransactionPin(user.id, body.password, body.newPin);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get the authenticated user\'s own profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Current user profile', type: (0, wrap_response_1.wrapResponse)(user_lite_dto_1.UserLiteDto) }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMe", null);
__decorate([
    (0, common_1.Get)('me/groups'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'List all groups the authenticated user belongs to', description: 'Returns every group the user has a contributor slot in, including groups they administer. Multiple slots in the same group are merged under a single entry.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User\'s groups', type: (0, wrap_response_1.wrapResponse)(my_groups_response_dto_1.MyGroupsResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, my_groups_query_dto_1.MyGroupsQueryDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "myGroups", null);
__decorate([
    (0, common_1.Get)('me/referrals'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get referral stats for the authenticated user', description: 'Returns the user\'s referral code, total number of users who signed up using it, and how many of those have completed KYC onboarding.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Referral stats' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "myReferrals", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'List users (paginated)',
        description: 'Group admins can list all users except super admins. Super admins can list all users including other super admins.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of users', type: (0, wrap_response_1.wrapResponse)(paginated_users_response_dto_1.PaginatedUsersResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_users_dto_1.ListUsersDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('bvn-verification'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Submit BVN for verification' }),
    (0, swagger_1.ApiBody)({ type: verify_bvn_dto_1.VerifyBvnDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'BVN processed', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, verify_bvn_dto_1.VerifyBvnDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "verifyBvn", null);
__decorate([
    (0, common_1.Post)(':id/onboarding'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Complete onboarding for invited user (set password/profile)' }),
    (0, swagger_1.ApiBody)({ type: onboard_invite_dto_1.OnboardInviteDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Onboarding completed', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, onboard_invite_dto_1.OnboardInviteDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "onboardInvite", null);
__decorate([
    (0, common_1.Post)(':id/upgrade'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Upgrade a PROXY user to full USER', description: 'Changes role from PROXY to USER and sets notification channel to EMAIL.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User upgraded', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "upgradeProxy", null);
__decorate([
    (0, common_1.Patch)('me/transaction-pin'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Change transaction PIN', description: 'Requires the current PIN and a new 6-digit PIN.' }),
    (0, swagger_1.ApiBody)({ type: change_transaction_pin_dto_1.ChangeTransactionPinDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'PIN changed successfully', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_transaction_pin_dto_1.ChangeTransactionPinDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "changeTransactionPin", null);
__decorate([
    (0, common_1.Post)('me/transaction-pin/reset'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Reset transaction PIN via account password', description: 'Use this when the current PIN is forgotten. Requires the account password to confirm identity.' }),
    (0, swagger_1.ApiBody)({ type: reset_transaction_pin_dto_1.ResetTransactionPinDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'PIN reset successfully', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reset_transaction_pin_dto_1.ResetTransactionPinDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "resetTransactionPin", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map