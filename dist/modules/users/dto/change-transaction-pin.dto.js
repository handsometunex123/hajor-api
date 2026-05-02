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
exports.ChangeTransactionPinDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ChangeTransactionPinDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { currentPin: { required: true, type: () => String, minLength: 6, maxLength: 6 }, newPin: { required: true, type: () => String, minLength: 6, maxLength: 6 } };
    }
}
exports.ChangeTransactionPinDto = ChangeTransactionPinDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current 6-digit transaction PIN', example: '123456' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumberString)({}, { message: 'currentPin must contain only digits' }),
    (0, class_validator_1.Length)(6, 6, { message: 'currentPin must be exactly 6 digits' }),
    __metadata("design:type", String)
], ChangeTransactionPinDto.prototype, "currentPin", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'New 6-digit transaction PIN', example: '654321' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumberString)({}, { message: 'newPin must contain only digits' }),
    (0, class_validator_1.Length)(6, 6, { message: 'newPin must be exactly 6 digits' }),
    __metadata("design:type", String)
], ChangeTransactionPinDto.prototype, "newPin", void 0);
//# sourceMappingURL=change-transaction-pin.dto.js.map