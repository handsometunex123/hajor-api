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
exports.GroupFeedItemDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
class GroupFeedItemDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, actorId: { required: false, type: () => String, nullable: true }, action: { required: true, type: () => String }, entityType: { required: true, type: () => String }, entityId: { required: true, type: () => String }, metadata: { required: false, type: () => Object }, createdAt: { required: true, type: () => Date } };
    }
}
exports.GroupFeedItemDto = GroupFeedItemDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], GroupFeedItemDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", String)
], GroupFeedItemDto.prototype, "actorId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], GroupFeedItemDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], GroupFeedItemDto.prototype, "entityType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], GroupFeedItemDto.prototype, "entityId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: 'object', additionalProperties: true }),
    __metadata("design:type", Object)
], GroupFeedItemDto.prototype, "metadata", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], GroupFeedItemDto.prototype, "createdAt", void 0);
//# sourceMappingURL=group-feed-item.dto.js.map