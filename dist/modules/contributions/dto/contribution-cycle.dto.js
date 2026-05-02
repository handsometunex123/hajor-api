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
exports.ContributionCycleDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const payment_item_dto_1 = require("./payment-item.dto");
class ContributionCycleDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, groupId: { required: true, type: () => String }, cycleNumber: { required: true, type: () => Number }, contributionDate: { required: true, type: () => String }, payoutDate: { required: true, type: () => String }, status: { required: true, type: () => String }, payments: { required: false, type: () => [require("./payment-item.dto").PaymentItemDto] } };
    }
}
exports.ContributionCycleDto = ContributionCycleDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ContributionCycleDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ContributionCycleDto.prototype, "groupId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ContributionCycleDto.prototype, "cycleNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ContributionCycleDto.prototype, "contributionDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ContributionCycleDto.prototype, "payoutDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ContributionCycleDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [payment_item_dto_1.PaymentItemDto], required: false }),
    __metadata("design:type", Array)
], ContributionCycleDto.prototype, "payments", void 0);
//# sourceMappingURL=contribution-cycle.dto.js.map