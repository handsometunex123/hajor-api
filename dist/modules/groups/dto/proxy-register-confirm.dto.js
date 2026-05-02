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
exports.ProxyRegisterConfirmDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class ProxyRegisterConfirmDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { phone: { required: true, type: () => String }, otp: { required: true, type: () => String, minLength: 6, maxLength: 6 } };
    }
}
exports.ProxyRegisterConfirmDto = ProxyRegisterConfirmDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The phone number used in the init step', example: '+2348012345678' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ProxyRegisterConfirmDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '6-digit OTP received by the user via SMS', example: '482913' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6, { message: 'OTP must be exactly 6 digits' }),
    __metadata("design:type", String)
], ProxyRegisterConfirmDto.prototype, "otp", void 0);
//# sourceMappingURL=proxy-register-confirm.dto.js.map