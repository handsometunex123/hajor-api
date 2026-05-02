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
exports.MyGroupStatusResponseDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
class MyContributorDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, displayId: { required: true, type: () => String }, payoutOrder: { required: true, type: () => Number, nullable: true }, isActive: { required: true, type: () => Boolean }, termsAcceptedAt: { required: true, type: () => String, nullable: true } };
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MyContributorDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Unique contributor display code' }),
    __metadata("design:type", String)
], MyContributorDto.prototype, "displayId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Number, nullable: true }),
    __metadata("design:type", Number)
], MyContributorDto.prototype, "payoutOrder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], MyContributorDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'When terms were accepted, or null if pending', type: String, format: 'date-time', nullable: true }),
    __metadata("design:type", String)
], MyContributorDto.prototype, "termsAcceptedAt", void 0);
class MyGroupStatusResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { isContributor: { required: true, type: () => Boolean }, termsRequired: { required: true, type: () => Boolean }, contributors: { required: true, type: () => [MyContributorDto] } };
    }
}
exports.MyGroupStatusResponseDto = MyGroupStatusResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the calling user is a contributor in this group' }),
    __metadata("design:type", Boolean)
], MyGroupStatusResponseDto.prototype, "isContributor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether this group has terms that must be accepted' }),
    __metadata("design:type", Boolean)
], MyGroupStatusResponseDto.prototype, "termsRequired", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The user\'s contributor slot(s) in this group', type: [MyContributorDto] }),
    __metadata("design:type", Array)
], MyGroupStatusResponseDto.prototype, "contributors", void 0);
//# sourceMappingURL=my-group-status-response.dto.js.map