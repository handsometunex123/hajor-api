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
exports.AuthTokenResponseDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
class AuthTokenResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { access_token: { required: true, type: () => String }, mustChangePassword: { required: true, type: () => Boolean } };
    }
}
exports.AuthTokenResponseDto = AuthTokenResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'JWT Bearer access token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    __metadata("design:type", String)
], AuthTokenResponseDto.prototype, "access_token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When true the user must call POST /auth/change-password before using the app. Set for proxy users on first login.',
        example: false,
    }),
    __metadata("design:type", Boolean)
], AuthTokenResponseDto.prototype, "mustChangePassword", void 0);
//# sourceMappingURL=auth-token-response.dto.js.map