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
exports.UpdateGroupDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const enums_1 = require("../../../common/enums");
class UpdateGroupDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: false, type: () => String, maxLength: 100 }, description: { required: false, type: () => String, maxLength: 1000 }, contributionAmount: { required: false, type: () => Number, minimum: 0 }, frequency: { required: false, enum: require("../../../common/enums").Frequency, enum: [enums_1.Frequency.WEEKLY, enums_1.Frequency.MONTHLY] }, maxSlots: { required: false, type: () => Number, minimum: 2 }, serviceCharge: { required: false, type: () => Number, minimum: 0 }, lateFee: { required: false, type: () => Number, minimum: 0 } };
    }
}
exports.UpdateGroupDto = UpdateGroupDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ maxLength: 100, example: 'My Savings Group' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateGroupDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ maxLength: 1000, example: 'Updated description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], UpdateGroupDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 0, example: 5000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateGroupDto.prototype, "contributionAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: enums_1.Frequency, example: enums_1.Frequency.WEEKLY }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)([enums_1.Frequency.WEEKLY, enums_1.Frequency.MONTHLY]),
    __metadata("design:type", String)
], UpdateGroupDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 2, example: 10 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(2),
    __metadata("design:type", Number)
], UpdateGroupDto.prototype, "maxSlots", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 0, example: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateGroupDto.prototype, "serviceCharge", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 0, example: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateGroupDto.prototype, "lateFee", void 0);
//# sourceMappingURL=update-group.dto.js.map