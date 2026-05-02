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
exports.AuditLogListResponseDto = exports.AuditLogItemDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
class AuditLogItemDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, actorId: { required: true, type: () => String, nullable: true }, action: { required: true, type: () => String }, entityType: { required: true, type: () => String }, entityId: { required: true, type: () => String }, metadata: { required: true, type: () => Object }, createdAt: { required: true, type: () => String } };
    }
}
exports.AuditLogItemDto = AuditLogItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Log entry UUID' }),
    __metadata("design:type", String)
], AuditLogItemDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'UUID of the user who triggered the action, or null for system events' }),
    __metadata("design:type", String)
], AuditLogItemDto.prototype, "actorId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Action name, e.g. provision_va, send_otp, reconcile_deposit_success' }),
    __metadata("design:type", String)
], AuditLogItemDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Entity type, e.g. User, Wallet, Transaction, Group' }),
    __metadata("design:type", String)
], AuditLogItemDto.prototype, "entityType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'UUID of the entity affected' }),
    __metadata("design:type", String)
], AuditLogItemDto.prototype, "entityId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Arbitrary JSON metadata attached to the event' }),
    __metadata("design:type", Object)
], AuditLogItemDto.prototype, "metadata", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ISO-8601 creation timestamp' }),
    __metadata("design:type", String)
], AuditLogItemDto.prototype, "createdAt", void 0);
class AuditLogPaginationMeta {
    static _OPENAPI_METADATA_FACTORY() {
        return { total: { required: true, type: () => Number }, page: { required: true, type: () => Number }, limit: { required: true, type: () => Number }, pages: { required: true, type: () => Number } };
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], AuditLogPaginationMeta.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], AuditLogPaginationMeta.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], AuditLogPaginationMeta.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], AuditLogPaginationMeta.prototype, "pages", void 0);
class AuditLogListResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { items: { required: true, type: () => [require("./audit-log-response.dto").AuditLogItemDto] }, pagination: { required: true, type: () => AuditLogPaginationMeta } };
    }
}
exports.AuditLogListResponseDto = AuditLogListResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [AuditLogItemDto] }),
    __metadata("design:type", Array)
], AuditLogListResponseDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: AuditLogPaginationMeta }),
    __metadata("design:type", AuditLogPaginationMeta)
], AuditLogListResponseDto.prototype, "pagination", void 0);
//# sourceMappingURL=audit-log-response.dto.js.map