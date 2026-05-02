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
exports.CreateWithdrawDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateWithdrawDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { amount: { required: true, type: () => Number }, recipient: { required: true, type: () => String }, note: { required: false, type: () => String }, transactionPin: { required: true, type: () => String, minLength: 6, maxLength: 6 } };
    }
}
exports.CreateWithdrawDto = CreateWithdrawDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Amount to withdraw (in Naira)', example: 5000 }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateWithdrawDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Paystack recipient code', example: 'RCP_xxxxxxxxxxxxxxxx' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWithdrawDto.prototype, "recipient", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional note for the withdrawal', example: 'Rent payment' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWithdrawDto.prototype, "note", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '6-digit transaction PIN', example: '123456' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumberString)({}, { message: 'transactionPin must contain only digits' }),
    (0, class_validator_1.Length)(6, 6, { message: 'transactionPin must be exactly 6 digits' }),
    __metadata("design:type", String)
], CreateWithdrawDto.prototype, "transactionPin", void 0);
//# sourceMappingURL=withdraw.dto.js.map