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
exports.GroupContributionStatusDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const contribution_cycle_dto_1 = require("./contribution-cycle.dto");
const contributor_lite_dto_1 = require("./contributor-lite.dto");
class GroupContributionStatusDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { current: { required: false, type: () => require("./contribution-cycle.dto").ContributionCycleDto, nullable: true }, paid: { required: true, type: () => [require("./contributor-lite.dto").ContributorLiteDto] }, unpaid: { required: true, type: () => [require("./contributor-lite.dto").ContributorLiteDto] }, defaulters: { required: true, type: () => [require("./contributor-lite.dto").ContributorLiteDto] } };
    }
}
exports.GroupContributionStatusDto = GroupContributionStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: contribution_cycle_dto_1.ContributionCycleDto, required: false }),
    __metadata("design:type", contribution_cycle_dto_1.ContributionCycleDto)
], GroupContributionStatusDto.prototype, "current", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [contributor_lite_dto_1.ContributorLiteDto] }),
    __metadata("design:type", Array)
], GroupContributionStatusDto.prototype, "paid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [contributor_lite_dto_1.ContributorLiteDto] }),
    __metadata("design:type", Array)
], GroupContributionStatusDto.prototype, "unpaid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [contributor_lite_dto_1.ContributorLiteDto] }),
    __metadata("design:type", Array)
], GroupContributionStatusDto.prototype, "defaulters", void 0);
//# sourceMappingURL=group-contribution-status.dto.js.map