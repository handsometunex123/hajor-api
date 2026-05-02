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
exports.AuditLogQueryDto = exports.AUDIT_SORT_FIELDS = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
exports.AUDIT_SORT_FIELDS = ['createdAt', 'action', 'entityType', 'actorId'];
class AuditLogQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 20;
        this.sortBy = 'createdAt';
        this.sortOrder = 'desc';
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { page: { required: false, type: () => Number, default: 1, minimum: 1 }, limit: { required: false, type: () => Number, default: 20, minimum: 1, maximum: 200 }, sortBy: { required: false, type: () => Object, default: "createdAt", enum: exports.AUDIT_SORT_FIELDS }, sortOrder: { required: false, type: () => Object, default: "desc", enum: ['asc', 'desc'] }, actorId: { required: false, type: () => String }, action: { required: false, type: () => String }, entityType: { required: false, type: () => String }, entityId: { required: false, type: () => String }, search: { required: false, type: () => String }, from: { required: false, type: () => String }, to: { required: false, type: () => String } };
    }
}
exports.AuditLogQueryDto = AuditLogQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: 'Page number (1-based)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], AuditLogQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 20, description: 'Page size (max 200)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(200),
    __metadata("design:type", Number)
], AuditLogQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: exports.AUDIT_SORT_FIELDS,
        example: 'createdAt',
        description: 'Field to sort by',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.AUDIT_SORT_FIELDS),
    __metadata("design:type", String)
], AuditLogQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['asc', 'desc'], example: 'desc', description: 'Sort direction' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['asc', 'desc']),
    __metadata("design:type", String)
], AuditLogQueryDto.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by acting user UUID. Pass "null" to get system-generated entries (actorId IS NULL).',
        example: 'a1b2c3d4-...',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AuditLogQueryDto.prototype, "actorId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by action name (exact match). E.g. send_otp, provision_va, reconcile_deposit_success.',
        example: 'provision_va',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AuditLogQueryDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by entity type (exact match). E.g. User, Wallet, Transaction, Group, Invitation.',
        example: 'Wallet',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AuditLogQueryDto.prototype, "entityType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by specific entity UUID.',
        example: 'f1e2d3c4-...',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AuditLogQueryDto.prototype, "entityId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Full-text search across the action field (case-insensitive contains).',
        example: 'provision',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AuditLogQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Return logs created on or after this ISO-8601 datetime.', example: '2026-01-01T00:00:00.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], AuditLogQueryDto.prototype, "from", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Return logs created on or before this ISO-8601 datetime.', example: '2026-12-31T23:59:59.999Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], AuditLogQueryDto.prototype, "to", void 0);
//# sourceMappingURL=audit-log-query.dto.js.map