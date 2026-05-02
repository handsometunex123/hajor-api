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
exports.MyGroupsResponseDto = exports.MyGroupsPaginationDto = exports.MyGroupItemDto = exports.MyGroupSlotDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
class MyGroupSlotDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, displayId: { required: true, type: () => String }, payoutOrder: { required: true, type: () => Number, nullable: true }, isActive: { required: true, type: () => Boolean }, termsAcceptedAt: { required: true, type: () => Date, nullable: true }, joinedAt: { required: true, type: () => Date } };
    }
}
exports.MyGroupSlotDto = MyGroupSlotDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MyGroupSlotDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MyGroupSlotDto.prototype, "displayId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Number)
], MyGroupSlotDto.prototype, "payoutOrder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], MyGroupSlotDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Date)
], MyGroupSlotDto.prototype, "termsAcceptedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], MyGroupSlotDto.prototype, "joinedAt", void 0);
class MyGroupItemDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, name: { required: true, type: () => String }, description: { required: true, type: () => String, nullable: true }, status: { required: true, type: () => String }, frequency: { required: true, type: () => String }, contributionAmount: { required: true, type: () => Number }, maxSlots: { required: true, type: () => Number }, isAdmin: { required: true, type: () => Boolean }, createdAt: { required: true, type: () => Date }, slots: { required: true, type: () => [require("./my-groups-response.dto").MyGroupSlotDto] } };
    }
}
exports.MyGroupItemDto = MyGroupItemDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MyGroupItemDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MyGroupItemDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", String)
], MyGroupItemDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MyGroupItemDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MyGroupItemDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MyGroupItemDto.prototype, "contributionAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MyGroupItemDto.prototype, "maxSlots", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'True if the authenticated user is the group admin' }),
    __metadata("design:type", Boolean)
], MyGroupItemDto.prototype, "isAdmin", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], MyGroupItemDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [MyGroupSlotDto], description: 'The contributor slot(s) the user holds in this group (max 2)' }),
    __metadata("design:type", Array)
], MyGroupItemDto.prototype, "slots", void 0);
class MyGroupsPaginationDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { total: { required: true, type: () => Number }, page: { required: true, type: () => Number }, limit: { required: true, type: () => Number }, pages: { required: true, type: () => Number } };
    }
}
exports.MyGroupsPaginationDto = MyGroupsPaginationDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MyGroupsPaginationDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MyGroupsPaginationDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MyGroupsPaginationDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MyGroupsPaginationDto.prototype, "pages", void 0);
class MyGroupsResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { items: { required: true, type: () => [require("./my-groups-response.dto").MyGroupItemDto] }, pagination: { required: true, type: () => require("./my-groups-response.dto").MyGroupsPaginationDto } };
    }
}
exports.MyGroupsResponseDto = MyGroupsResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [MyGroupItemDto] }),
    __metadata("design:type", Array)
], MyGroupsResponseDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: MyGroupsPaginationDto }),
    __metadata("design:type", MyGroupsPaginationDto)
], MyGroupsResponseDto.prototype, "pagination", void 0);
//# sourceMappingURL=my-groups-response.dto.js.map