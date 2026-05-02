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
exports.GroupCreatedResponseDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
class SimpleGroup {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, name: { required: true, type: () => String } };
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SimpleGroup.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SimpleGroup.prototype, "name", void 0);
class GroupCreatedResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { group: { required: true, type: () => SimpleGroup }, joinUrl: { required: true, type: () => String }, token: { required: true, type: () => String } };
    }
}
exports.GroupCreatedResponseDto = GroupCreatedResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: SimpleGroup }),
    __metadata("design:type", SimpleGroup)
], GroupCreatedResponseDto.prototype, "group", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], GroupCreatedResponseDto.prototype, "joinUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], GroupCreatedResponseDto.prototype, "token", void 0);
//# sourceMappingURL=group-created-response.dto.js.map