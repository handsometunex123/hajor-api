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
exports.GroupSearchQueryDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const enums_1 = require("../../../common/enums");
class GroupSearchQueryDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: false, type: () => String }, frequency: { required: false, enum: require("../../../common/enums").Frequency, enum: [enums_1.Frequency.WEEKLY, enums_1.Frequency.MONTHLY] }, status: { required: false, type: () => String }, contributionAmount: { required: false, type: () => Number, minimum: 0 }, contributionAmountMin: { required: false, type: () => Number, minimum: 0 }, contributionAmountMax: { required: false, type: () => Number, minimum: 0 }, page: { required: false, type: () => Number }, limit: { required: false, type: () => Number }, sortBy: { required: false, type: () => String }, sortOrder: { required: false, type: () => Object, enum: ['asc', 'desc'] } };
    }
}
exports.GroupSearchQueryDto = GroupSearchQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Search by group name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GroupSearchQueryDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Frequency filter (e.g. WEEKLY)', enum: enums_1.Frequency }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)([enums_1.Frequency.WEEKLY, enums_1.Frequency.MONTHLY]),
    __metadata("design:type", String)
], GroupSearchQueryDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Status filter' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GroupSearchQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by exact contribution amount', example: 5000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], GroupSearchQueryDto.prototype, "contributionAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Minimum contribution amount', example: 1000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], GroupSearchQueryDto.prototype, "contributionAmountMin", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Maximum contribution amount', example: 10000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], GroupSearchQueryDto.prototype, "contributionAmountMax", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page number (1-based)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], GroupSearchQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page size (max 500)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], GroupSearchQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Sort field' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GroupSearchQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Sort order: asc or desc' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['asc', 'desc']),
    __metadata("design:type", String)
], GroupSearchQueryDto.prototype, "sortOrder", void 0);
//# sourceMappingURL=group-search-query.dto.js.map