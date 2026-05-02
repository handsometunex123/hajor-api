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
exports.WalletController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/jwt.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const roles_guard_1 = require("../../common/guards/roles.guard");
const wallet_service_1 = require("./wallet.service");
const list_query_dto_1 = require("../../common/dto/list-query.dto");
const swagger_1 = require("@nestjs/swagger");
const wrap_response_1 = require("../../common/dto/wrap-response");
const paginated_transactions_response_dto_1 = require("./dto/paginated-transactions-response.dto");
const paginated_wallets_response_dto_1 = require("./dto/paginated-wallets-response.dto");
const balance_response_dto_1 = require("./dto/balance-response.dto");
const ok_response_dto_1 = require("../../common/dto/ok-response.dto");
let WalletController = class WalletController {
    constructor(walletService) {
        this.walletService = walletService;
    }
    async getBalance(user) {
        const wallet = await this.walletService.getWalletByUser(user.id);
        if (!wallet)
            throw new common_1.NotFoundException('Wallet not found for user');
        const balance = await this.walletService.getBalance(wallet.id);
        return { balance };
    }
    async listTransactions(user, q, type, status) {
        const wallet = await this.walletService.getWalletByUser(user.id);
        if (!wallet)
            throw new common_1.NotFoundException('Wallet not found for user');
        return this.walletService.getTransactions(wallet.id, { page: q.page, limit: q.limit, type, status, sortBy: q.sortBy, sortOrder: q.sortOrder });
    }
    async listNonProvisioned(query) {
        const opts = {};
        if (query.page)
            opts.page = query.page;
        if (query.limit)
            opts.limit = query.limit;
        if (query.sortBy)
            opts.sortBy = query.sortBy;
        if (query.sortOrder)
            opts.sortOrder = query.sortOrder;
        const rows = await this.walletService.listNonProvisioned(opts);
        return rows;
    }
    async adminTriggerProvision(walletId) {
        try {
            return await this.walletService.triggerProvision(walletId);
        }
        catch (err) {
            throw new common_1.NotFoundException((err === null || err === void 0 ? void 0 : err.message) || 'Failed to enqueue provisioning');
        }
    }
    async devProvisionAll() {
        if (process.env.NODE_ENV === 'production') {
            throw new common_1.ForbiddenException('This endpoint is not available in production');
        }
        return this.walletService.devProvisionAll();
    }
    async devFundWallet(userId, amount) {
        if (process.env.NODE_ENV === 'production') {
            throw new common_1.ForbiddenException('This endpoint is not available in production');
        }
        if (!userId)
            throw new common_1.BadRequestException('userId is required');
        if (!amount || amount <= 0)
            throw new common_1.BadRequestException('amount must be a positive number');
        try {
            return await this.walletService.devFundWallet(userId, amount);
        }
        catch (err) {
            throw new common_1.NotFoundException((err === null || err === void 0 ? void 0 : err.message) || 'Failed to fund wallet');
        }
    }
};
exports.WalletController = WalletController;
__decorate([
    (0, common_1.Get)('me/balance'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get the authenticated user\'s wallet balance' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Wallet balance', type: (0, wrap_response_1.wrapResponse)(balance_response_dto_1.BalanceResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Get)('me/transactions'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get the authenticated user\'s transaction history' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, enum: ['CREDIT', 'DEBIT'], description: 'Filter by transaction type' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, type: String, description: 'Filter by transaction status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transaction history', type: (0, wrap_response_1.wrapResponse)(paginated_transactions_response_dto_1.PaginatedTransactionsResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_query_dto_1.ListQueryDto, String, String]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "listTransactions", null);
__decorate([
    (0, common_1.Get)('admin/non-provisioned'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'List non-provisioned wallets (admin)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of non-provisioned wallets', type: (0, wrap_response_1.wrapResponse)(paginated_wallets_response_dto_1.PaginatedWalletsResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_query_dto_1.ListQueryDto]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "listNonProvisioned", null);
__decorate([
    (0, common_1.Post)(':walletId/provisions'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Trigger wallet provisioning (admin)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Provision triggered', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('walletId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "adminTriggerProvision", null);
__decorate([
    (0, common_1.Post)('dev/provision-all'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: '[DEV ONLY] Provision all wallets', description: 'Instantly marks every un-provisioned wallet as PROVISIONED with dummy Paystack data. Only works when NODE_ENV !== production.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Wallets provisioned.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Not available in production.' }),
    openapi.ApiResponse({ status: 201 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "devProvisionAll", null);
__decorate([
    (0, common_1.Post)('dev/fund'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({
        summary: '[DEV ONLY] Fund a user wallet',
        description: 'Creates a SUCCESS CREDIT transaction on the specified user\'s wallet. Not available in production.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            required: ['userId', 'amount'],
            properties: {
                userId: { type: 'string', example: 'clxyz123abc', description: 'ID of the user whose wallet to fund' },
                amount: { type: 'number', example: 15000, description: 'Amount to credit (positive number)' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Wallet funded', schema: { type: 'object', properties: { walletId: { type: 'string' }, credited: { type: 'number' }, newBalance: { type: 'string' } } } }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Not available in production.' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)('userId')),
    __param(1, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "devFundWallet", null);
exports.WalletController = WalletController = __decorate([
    (0, swagger_1.ApiTags)('Wallets'),
    (0, common_1.Controller)('wallets'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [wallet_service_1.WalletService])
], WalletController);
//# sourceMappingURL=wallet.controller.js.map