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
exports.AddContributorDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class AddContributorDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { userId: { required: true, type: () => String }, attestationText: { required: true, type: () => String }, agreementAccepted: { required: true, type: () => Boolean }, ipAddress: { required: false, type: () => String } };
    }
}
exports.AddContributorDto = AddContributorDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddContributorDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Attestation text confirming admin responsibility' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddContributorDto.prototype, "attestationText", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Admin must agree to indemnity terms' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AddContributorDto.prototype, "agreementAccepted", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddContributorDto.prototype, "ipAddress", void 0);
//# sourceMappingURL=add-contributor.dto.js.map