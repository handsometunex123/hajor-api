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
exports.PaymentItemDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const contributor_lite_dto_1 = require("./contributor-lite.dto");
class PaymentItemDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { paymentId: { required: true, type: () => String }, contributor: { required: true, type: () => require("./contributor-lite.dto").ContributorLiteDto } };
    }
}
exports.PaymentItemDto = PaymentItemDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentItemDto.prototype, "paymentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: contributor_lite_dto_1.ContributorLiteDto }),
    __metadata("design:type", contributor_lite_dto_1.ContributorLiteDto)
], PaymentItemDto.prototype, "contributor", void 0);
//# sourceMappingURL=payment-item.dto.js.map