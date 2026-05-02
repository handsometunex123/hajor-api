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
exports.NotificationsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const wrap_response_1 = require("../../common/dto/wrap-response");
const notifications_service_1 = require("./notifications.service");
const list_query_dto_1 = require("../../common/dto/list-query.dto");
const jwt_guard_1 = require("../auth/jwt.guard");
const notification_response_dto_1 = require("./dto/notification-response.dto");
const class_validator_1 = require("class-validator");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
class NotifyDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NotifyDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NotifyDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NotifyDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], NotifyDto.prototype, "payload", void 0);
let NotificationsController = class NotificationsController {
    constructor(notifications) {
        this.notifications = notifications;
    }
    async notify(dto) {
        try {
            const res = await this.notifications.sendNotification(dto);
            return { id: res.id };
        }
        catch (err) {
            throw new common_1.BadRequestException((err === null || err === void 0 ? void 0 : err.message) || 'Failed to create notification');
        }
    }
    async list(req, query, isRead, type) {
        var _a, _b;
        try {
            const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.sub);
            if (!userId)
                throw new common_1.BadRequestException('Missing authenticated user');
            const opts = { page: query.page, limit: query.limit, sortBy: query.sortBy, sortOrder: query.sortOrder };
            if (isRead === 'true')
                opts.isRead = true;
            else if (isRead === 'false')
                opts.isRead = false;
            if (type)
                opts.type = type;
            return await this.notifications.listByUser(userId, opts);
        }
        catch (err) {
            throw new common_1.BadRequestException((err === null || err === void 0 ? void 0 : err.message) || 'Failed to list notifications');
        }
    }
    async update(id, req) {
        var _a, _b;
        try {
            const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.sub);
            if (!userId)
                throw new common_1.BadRequestException('Missing authenticated user');
            const updated = await this.notifications.markRead(id, userId);
            return { id: updated.id, isRead: updated.isRead };
        }
        catch (err) {
            throw new common_1.BadRequestException((err === null || err === void 0 ? void 0 : err.message) || 'Failed to mark notification read');
        }
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create and send a notification (admin/debug)' }),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiBody)({ type: NotifyDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Notification created', type: (0, wrap_response_1.wrapResponse)(notification_response_dto_1.NotificationResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [NotifyDto]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "notify", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List notifications for authenticated user' }),
    (0, swagger_1.ApiQuery)({ name: 'isRead', required: false, type: Boolean, description: 'Filter by read status' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, type: String, description: 'Filter by notification type' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of notifications', type: (0, wrap_response_1.wrapArrayResponse)(notification_response_dto_1.NotificationResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('isRead')),
    __param(3, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_query_dto_1.ListQueryDto, String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a notification (mark as read)' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { isRead: { type: 'boolean' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Notification updated', type: (0, wrap_response_1.wrapResponse)(notification_response_dto_1.NotificationResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "update", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, swagger_1.ApiTags)('Notifications'),
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map