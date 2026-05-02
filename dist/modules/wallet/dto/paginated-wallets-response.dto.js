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
exports.PaginatedWalletsResponseDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const non_provisioned_wallet_item_dto_1 = require("./non-provisioned-wallet-item.dto");
class PaginationMeta {
    static _OPENAPI_METADATA_FACTORY() {
        return { total: { required: true, type: () => Number }, page: { required: true, type: () => Number }, limit: { required: true, type: () => Number }, pages: { required: true, type: () => Number } };
    }
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginationMeta.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginationMeta.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginationMeta.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginationMeta.prototype, "pages", void 0);
class PaginatedWalletsResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { items: { required: true, type: () => [require("./non-provisioned-wallet-item.dto").NonProvisionedWalletItemDto] }, pagination: { required: true, type: () => PaginationMeta } };
    }
}
exports.PaginatedWalletsResponseDto = PaginatedWalletsResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [non_provisioned_wallet_item_dto_1.NonProvisionedWalletItemDto] }),
    __metadata("design:type", Array)
], PaginatedWalletsResponseDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: PaginationMeta }),
    __metadata("design:type", PaginationMeta)
], PaginatedWalletsResponseDto.prototype, "pagination", void 0);
//# sourceMappingURL=paginated-wallets-response.dto.js.map