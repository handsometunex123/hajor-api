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
exports.ContributorListResponseDto = exports.ContributorItemDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
class ContributorUserDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, firstName: { required: true, type: () => String }, lastName: { required: true, type: () => String }, email: { required: true, type: () => String }, phone: { required: false, type: () => String } };
    }
}
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cuid-user-id' }),
    __metadata("design:type", String)
], ContributorUserDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John' }),
    __metadata("design:type", String)
], ContributorUserDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Doe' }),
    __metadata("design:type", String)
], ContributorUserDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'john@example.com' }),
    __metadata("design:type", String)
], ContributorUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+2348012345678' }),
    __metadata("design:type", String)
], ContributorUserDto.prototype, "phone", void 0);
class ContributorItemDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, displayId: { required: true, type: () => String }, userId: { required: true, type: () => String }, payoutOrder: { required: false, type: () => Number, nullable: true }, isActive: { required: true, type: () => Boolean }, termsAcceptedAt: { required: false, type: () => Date, nullable: true }, joinedAt: { required: true, type: () => Date }, user: { required: true, type: () => ContributorUserDto }, joinMethod: { required: true, type: () => String } };
    }
}
exports.ContributorItemDto = ContributorItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cuid-contributor-id' }),
    __metadata("design:type", String)
], ContributorItemDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'HAJOR-JOHDOE-1-K7FX2BNQ', description: 'Unique, human-readable contributor code' }),
    __metadata("design:type", String)
], ContributorItemDto.prototype, "displayId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cuid-user-id' }),
    __metadata("design:type", String)
], ContributorItemDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, nullable: true, description: 'Position in the payout rotation' }),
    __metadata("design:type", Number)
], ContributorItemDto.prototype, "payoutOrder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], ContributorItemDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-04-06T12:00:00.000Z', nullable: true, description: 'When the contributor accepted the group terms. Null if not yet accepted.' }),
    __metadata("design:type", Date)
], ContributorItemDto.prototype, "termsAcceptedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-04-06T00:00:00.000Z' }),
    __metadata("design:type", Date)
], ContributorItemDto.prototype, "joinedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: ContributorUserDto }),
    __metadata("design:type", ContributorUserDto)
], ContributorItemDto.prototype, "user", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'join_request', description: 'How the contributor joined the group' }),
    __metadata("design:type", String)
], ContributorItemDto.prototype, "joinMethod", void 0);
class PaginationDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { total: { required: true, type: () => Number }, page: { required: true, type: () => Number }, limit: { required: true, type: () => Number }, pages: { required: true, type: () => Number } };
    }
}
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5 }),
    __metadata("design:type", Number)
], PaginationDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], PaginationDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 20 }),
    __metadata("design:type", Number)
], PaginationDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], PaginationDto.prototype, "pages", void 0);
class ContributorListResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { groupId: { required: true, type: () => String }, slots: { required: true, type: () => Number }, items: { required: true, type: () => [require("./contributor-list-response.dto").ContributorItemDto] }, pagination: { required: true, type: () => PaginationDto } };
    }
}
exports.ContributorListResponseDto = ContributorListResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cuid-group-id' }),
    __metadata("design:type", String)
], ContributorListResponseDto.prototype, "groupId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10, description: 'Maximum contributor slots for the group' }),
    __metadata("design:type", Number)
], ContributorListResponseDto.prototype, "slots", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [ContributorItemDto] }),
    __metadata("design:type", Array)
], ContributorListResponseDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: PaginationDto }),
    __metadata("design:type", PaginationDto)
], ContributorListResponseDto.prototype, "pagination", void 0);
//# sourceMappingURL=contributor-list-response.dto.js.map