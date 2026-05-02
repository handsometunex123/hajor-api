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
exports.CreateTicketDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateTicketDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { type: { required: true, type: () => Object }, groupId: { required: true, type: () => String }, reason: { required: false, type: () => String }, contributorId: { required: false, type: () => String }, newUserId: { required: false, type: () => String } };
    }
}
exports.CreateTicketDto = CreateTicketDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['CONTRIBUTOR_REPLACEMENT', 'LEAVE_GROUP'] }),
    (0, class_validator_1.IsEnum)(['CONTRIBUTOR_REPLACEMENT', 'LEAVE_GROUP']),
    __metadata("design:type", String)
], CreateTicketDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTicketDto.prototype, "groupId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTicketDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'For CONTRIBUTOR_REPLACEMENT: the contributorId to replace', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTicketDto.prototype, "contributorId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'For CONTRIBUTOR_REPLACEMENT: the new user to add', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTicketDto.prototype, "newUserId", void 0);
//# sourceMappingURL=create-ticket.dto.js.map