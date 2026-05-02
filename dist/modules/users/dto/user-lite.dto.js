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
exports.UserLiteDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class UserLiteDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, firstName: { required: false, type: () => String }, lastName: { required: false, type: () => String }, email: { required: false, type: () => String }, phone: { required: false, type: () => String }, dob: { required: false, type: () => String }, address: { required: false, type: () => String }, trustScore: { required: false, type: () => Number }, bvnVerified: { required: false, type: () => Boolean }, createdAt: { required: false, type: () => String }, referralCode: { required: false, type: () => String }, notificationChannel: { required: false, type: () => String }, role: { required: false, type: () => Object }, kycTier: { required: false, type: () => Number }, bvnVerifiedAt: { required: false, type: () => String }, bvnVerificationRef: { required: false, type: () => String }, emailVerifiedAt: { required: false, type: () => String }, lastActiveAt: { required: false, type: () => String } };
    }
}
exports.UserLiteDto = UserLiteDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UserLiteDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UserLiteDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UserLiteDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UserLiteDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UserLiteDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], UserLiteDto.prototype, "dob", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], UserLiteDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Number)
], UserLiteDto.prototype, "trustScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: "Whether the user's BVN is verified" }),
    __metadata("design:type", Boolean)
], UserLiteDto.prototype, "bvnVerified", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], UserLiteDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Unique referral code for this user' }),
    __metadata("design:type", String)
], UserLiteDto.prototype, "referralCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: 'EMAIL', description: 'Notification delivery channel: EMAIL, SMS, or BOTH' }),
    __metadata("design:type", String)
], UserLiteDto.prototype, "notificationChannel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.UserRole, enumName: 'UserRole', required: false, example: client_1.UserRole.USER }),
    __metadata("design:type", String)
], UserLiteDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Number)
], UserLiteDto.prototype, "kycTier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], UserLiteDto.prototype, "bvnVerifiedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], UserLiteDto.prototype, "bvnVerificationRef", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], UserLiteDto.prototype, "emailVerifiedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], UserLiteDto.prototype, "lastActiveAt", void 0);
//# sourceMappingURL=user-lite.dto.js.map