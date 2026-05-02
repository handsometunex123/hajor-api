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
exports.CreateGroupDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const enums_1 = require("../../../common/enums");
class CreateGroupDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String, maxLength: 100 }, description: { required: false, type: () => String, maxLength: 1000 }, maxSlots: { required: true, type: () => Number, minimum: 2 }, contributionAmount: { required: true, type: () => Number, minimum: 0 }, frequency: { required: true, enum: require("../../../common/enums").Frequency, enum: [enums_1.Frequency.WEEKLY, enums_1.Frequency.MONTHLY] }, serviceCharge: { required: false, type: () => Number, minimum: 0 }, lateFee: { required: false, type: () => Number, minimum: 0 }, gracePeriodDays: { required: false, type: () => Number, minimum: 1, maximum: 7 }, adminIndemnityAccepted: { required: true, type: () => Boolean } };
    }
}
exports.CreateGroupDto = CreateGroupDto;
__decorate([
    (0, swagger_1.ApiProperty)({ maxLength: 100, example: 'My Savings Group' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateGroupDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ maxLength: 1000, example: 'A short description of the group' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateGroupDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ minimum: 2, example: 10 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(2),
    __metadata("design:type", Number)
], CreateGroupDto.prototype, "maxSlots", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ minimum: 0, example: 5000 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateGroupDto.prototype, "contributionAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: enums_1.Frequency, example: enums_1.Frequency.WEEKLY }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)([enums_1.Frequency.WEEKLY, enums_1.Frequency.MONTHLY]),
    __metadata("design:type", String)
], CreateGroupDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 0, example: 0 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateGroupDto.prototype, "serviceCharge", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 0, example: 0 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateGroupDto.prototype, "lateFee", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 1, maximum: 7, description: 'Grace period in days before defaulting unpaid contributions (default: 1)', example: 2 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(7),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateGroupDto.prototype, "gracePeriodDays", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Admin must accept the platform indemnity and terms to create a group', example: true }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.Equals)(true, { message: 'Admin must accept the platform indemnity and terms' }),
    __metadata("design:type", Boolean)
], CreateGroupDto.prototype, "adminIndemnityAccepted", void 0);
//# sourceMappingURL=create-group.dto.js.map