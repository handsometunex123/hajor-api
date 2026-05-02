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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsListResponseDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
class ConversationUser {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, firstName: { required: true, type: () => String }, lastName: { required: true, type: () => String }, email: { required: true, type: () => String } };
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ConversationUser.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ConversationUser.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ConversationUser.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ConversationUser.prototype, "email", void 0);
class LastMessage {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, content: { required: true, type: () => String }, createdAt: { required: true, type: () => Date }, isRead: { required: true, type: () => Boolean } };
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], LastMessage.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], LastMessage.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], LastMessage.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], LastMessage.prototype, "isRead", void 0);
class ConversationWithDetails {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, groupId: { required: true, type: () => String }, userId: { required: true, type: () => String }, user: { required: true, type: () => ConversationUser }, lastMessage: { required: false, type: () => LastMessage }, unreadCount: { required: true, type: () => Number }, createdAt: { required: true, type: () => Date }, updatedAt: { required: true, type: () => Date } };
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ConversationWithDetails.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ConversationWithDetails.prototype, "groupId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ConversationWithDetails.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: ConversationUser }),
    __metadata("design:type", ConversationUser)
], ConversationWithDetails.prototype, "user", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: LastMessage, required: false }),
    __metadata("design:type", LastMessage)
], ConversationWithDetails.prototype, "lastMessage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ConversationWithDetails.prototype, "unreadCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ConversationWithDetails.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ConversationWithDetails.prototype, "updatedAt", void 0);
class Pagination {
    static _OPENAPI_METADATA_FACTORY() {
        return { total: { required: true, type: () => Number }, page: { required: true, type: () => Number }, limit: { required: true, type: () => Number }, pages: { required: true, type: () => Number } };
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], Pagination.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], Pagination.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], Pagination.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], Pagination.prototype, "pages", void 0);
class ConversationsListResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { data: { required: true, type: () => [ConversationWithDetails] }, pagination: { required: true, type: () => Pagination } };
    }
}
exports.ConversationsListResponseDto = ConversationsListResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [ConversationWithDetails] }),
    __metadata("design:type", Array)
], ConversationsListResponseDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: Pagination }),
    __metadata("design:type", Pagination)
], ConversationsListResponseDto.prototype, "pagination", void 0);
//# sourceMappingURL=conversations-list-response.dto.js.map