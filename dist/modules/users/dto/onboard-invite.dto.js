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
exports.OnboardInviteDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class OnboardInviteDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { token: { required: true, type: () => String }, password: { required: true, type: () => String }, transactionPin: { required: true, type: () => String, minLength: 6, maxLength: 6 }, phone: { required: true, type: () => String }, bvn: { required: true, type: () => String }, bvnValidationToken: { required: true, type: () => String }, firstName: { required: false, type: () => String }, lastName: { required: false, type: () => String }, dob: { required: false, type: () => String }, address: { required: false, type: () => String }, utilityBillUrl: { required: false, type: () => String } };
    }
}
exports.OnboardInviteDto = OnboardInviteDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'One-time registration token from the invite email' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardInviteDto.prototype, "token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Password to set for the new account', format: 'password' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardInviteDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '6-digit transaction PIN', example: '123456' }),
    (0, class_validator_1.IsNumberString)(),
    (0, class_validator_1.Length)(6, 6),
    __metadata("design:type", String)
], OnboardInviteDto.prototype, "transactionPin", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+2348012345678' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardInviteDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "User's Bank Verification Number", example: '12345678901' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardInviteDto.prototype, "bvn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'BVN validation token obtained from the BVN pre-validation endpoint' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardInviteDto.prototype, "bvnValidationToken", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'John' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardInviteDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Doe' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardInviteDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '1990-01-15' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardInviteDto.prototype, "dob", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '12 Lagos Street, Abuja' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardInviteDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'URL of uploaded utility bill for address verification' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardInviteDto.prototype, "utilityBillUrl", void 0);
//# sourceMappingURL=onboard-invite.dto.js.map