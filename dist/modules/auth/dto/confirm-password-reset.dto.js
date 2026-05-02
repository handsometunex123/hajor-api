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
exports.ConfirmPasswordResetDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ConfirmPasswordResetDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { email: { required: true, type: () => String }, otp: { required: true, type: () => String }, newPassword: { required: true, type: () => String, minLength: 8 } };
    }
}
exports.ConfirmPasswordResetDto = ConfirmPasswordResetDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'user@example.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], ConfirmPasswordResetDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123456', description: '6-digit OTP sent to the user' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfirmPasswordResetDto.prototype, "otp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'NewP@ssw0rd', description: 'New password (min 8 characters)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], ConfirmPasswordResetDto.prototype, "newPassword", void 0);
//# sourceMappingURL=confirm-password-reset.dto.js.map