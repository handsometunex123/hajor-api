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
exports.InviteItemDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
class UserLiteDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, firstName: { required: false, type: () => String }, lastName: { required: false, type: () => String }, email: { required: false, type: () => String }, phone: { required: false, type: () => String } };
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UserLiteDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], UserLiteDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], UserLiteDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], UserLiteDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], UserLiteDto.prototype, "phone", void 0);
class InviteItemDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, user: { required: false, type: () => UserLiteDto, nullable: true }, invitedBy: { required: false, type: () => UserLiteDto, nullable: true }, metadata: { required: false, type: () => Object, nullable: true }, status: { required: true, type: () => String }, createdAt: { required: true, type: () => String } };
    }
}
exports.InviteItemDto = InviteItemDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InviteItemDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: UserLiteDto, required: false }),
    __metadata("design:type", UserLiteDto)
], InviteItemDto.prototype, "user", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: UserLiteDto, required: false }),
    __metadata("design:type", UserLiteDto)
], InviteItemDto.prototype, "invitedBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], InviteItemDto.prototype, "metadata", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InviteItemDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InviteItemDto.prototype, "createdAt", void 0);
//# sourceMappingURL=invite-item.dto.js.map