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
exports.CreateUserDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const min_age_decorator_1 = require("../../..//common/validators/min-age.decorator");
const swagger_1 = require("@nestjs/swagger");
class CreateUserDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { firstName: { required: true, type: () => String }, lastName: { required: true, type: () => String }, email: { required: true, type: () => String }, phone: { required: true, type: () => String, pattern: "/^\\+234\\d{10}$/" }, bvn: { required: true, type: () => String }, dob: { required: true, type: () => Date }, password: { required: true, type: () => String, minLength: 8, pattern: "/(?=.*[a-z])/" }, transactionPin: { required: true, type: () => String, minLength: 6, maxLength: 6 }, address: { required: false, type: () => String }, utilityBillUrl: { required: false, type: () => String }, referralCode: { required: false, type: () => String }, bvnValidationToken: { required: true, type: () => String } };
    }
}
exports.CreateUserDto = CreateUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'First name', example: 'John' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Last name', example: 'Doe' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email address', example: 'john.doe@example.com' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Nigerian phone number in international format',
        example: '+2347038939208',
        pattern: '^\\+234\\d{10}$',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+234\d{10}$/, { message: 'phone must be a Nigerian number in international format (e.g. +2347038939208)' }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Bank Verification Number', example: '12345678901' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "bvn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date of birth (must be at least 16 years old)', example: '1995-06-15' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsDateString)(),
    (0, min_age_decorator_1.MinAge)(16, { message: 'user must be at least 16 years old' }),
    __metadata("design:type", Date)
], CreateUserDto.prototype, "dob", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User password', example: 'StrongP@ssw0rd', format: 'password' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'password must be at least 8 characters long' }),
    (0, class_validator_1.Matches)(/(?=.*[a-z])/, { message: 'password must contain at least one lowercase letter' }),
    (0, class_validator_1.Matches)(/(?=.*[A-Z])/, { message: 'password must contain at least one uppercase letter' }),
    (0, class_validator_1.Matches)(/(?=.*\d)/, { message: 'password must contain at least one number' }),
    (0, class_validator_1.Matches)(/(?=.*[^A-Za-z0-9])/, { message: 'password must contain at least one special character' }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '6-digit numeric transaction PIN', example: '123456' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumberString)({}, { message: 'transactionPin must contain only digits' }),
    (0, class_validator_1.Length)(6, 6, { message: 'transactionPin must be exactly 6 digits' }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "transactionPin", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Residential address', example: '12 Lagos Street, Abuja' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'URL of uploaded utility bill document', example: 'https://cdn.example.com/bills/abc.pdf' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "utilityBillUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Referral code of the user who referred you', example: 'REF12345' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "referralCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Short-lived token obtained from POST /auth/validate-bvn', example: 'a1b2c3d4e5f6...' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "bvnValidationToken", void 0);
//# sourceMappingURL=create-user.dto.js.map