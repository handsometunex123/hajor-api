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
exports.BvnTokenResponseDto = exports.ValidateBvnDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ValidateBvnDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { bvn: { required: true, type: () => String }, firstName: { required: true, type: () => String }, lastName: { required: true, type: () => String }, dob: { required: true, type: () => String }, phone: { required: true, type: () => String } };
    }
}
exports.ValidateBvnDto = ValidateBvnDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: "User's 11-digit Bank Verification Number", example: '12345678901' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ValidateBvnDto.prototype, "bvn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ValidateBvnDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Doe' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ValidateBvnDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date of birth matching BVN record (YYYY-MM-DD)', example: '1990-01-01' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ValidateBvnDto.prototype, "dob", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+2348012345678' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ValidateBvnDto.prototype, "phone", void 0);
class BvnTokenResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { token: { required: true, type: () => String } };
    }
}
exports.BvnTokenResponseDto = BvnTokenResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Short-lived token to be passed to the registration or onboarding endpoint. Expires in 5 minutes.', example: 'a3f9c2...' }),
    __metadata("design:type", String)
], BvnTokenResponseDto.prototype, "token", void 0);
//# sourceMappingURL=validate-bvn.dto.js.map