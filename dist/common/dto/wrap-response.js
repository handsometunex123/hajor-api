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
exports.wrapResponse = wrapResponse;
exports.wrapArrayResponse = wrapArrayResponse;
const swagger_1 = require("@nestjs/swagger");
function wrapResponse(DataType) {
    class WrappedResponse {
    }
    __decorate([
        (0, swagger_1.ApiProperty)({ example: 200 }),
        __metadata("design:type", Number)
    ], WrappedResponse.prototype, "statusCode", void 0);
    __decorate([
        (0, swagger_1.ApiProperty)({ example: '2026-04-06T00:00:00.000Z' }),
        __metadata("design:type", String)
    ], WrappedResponse.prototype, "timestamp", void 0);
    __decorate([
        (0, swagger_1.ApiProperty)({ example: '/endpoint' }),
        __metadata("design:type", String)
    ], WrappedResponse.prototype, "path", void 0);
    __decorate([
        (0, swagger_1.ApiProperty)({ nullable: true, required: false, example: 'uuid-here' }),
        __metadata("design:type", String)
    ], WrappedResponse.prototype, "requestId", void 0);
    __decorate([
        (0, swagger_1.ApiProperty)({ type: () => DataType }),
        __metadata("design:type", void 0)
    ], WrappedResponse.prototype, "data", void 0);
    __decorate([
        (0, swagger_1.ApiProperty)({ example: 'OK' }),
        __metadata("design:type", String)
    ], WrappedResponse.prototype, "code", void 0);
    Object.defineProperty(WrappedResponse, 'name', {
        value: `Wrapped${DataType.name}`,
    });
    return WrappedResponse;
}
function wrapArrayResponse(DataType) {
    class WrappedArrayResponse {
    }
    __decorate([
        (0, swagger_1.ApiProperty)({ example: 200 }),
        __metadata("design:type", Number)
    ], WrappedArrayResponse.prototype, "statusCode", void 0);
    __decorate([
        (0, swagger_1.ApiProperty)({ example: '2026-04-06T00:00:00.000Z' }),
        __metadata("design:type", String)
    ], WrappedArrayResponse.prototype, "timestamp", void 0);
    __decorate([
        (0, swagger_1.ApiProperty)({ example: '/endpoint' }),
        __metadata("design:type", String)
    ], WrappedArrayResponse.prototype, "path", void 0);
    __decorate([
        (0, swagger_1.ApiProperty)({ nullable: true, required: false, example: 'uuid-here' }),
        __metadata("design:type", String)
    ], WrappedArrayResponse.prototype, "requestId", void 0);
    __decorate([
        (0, swagger_1.ApiProperty)({ type: () => DataType, isArray: true }),
        __metadata("design:type", Array)
    ], WrappedArrayResponse.prototype, "data", void 0);
    __decorate([
        (0, swagger_1.ApiProperty)({ example: 'OK' }),
        __metadata("design:type", String)
    ], WrappedArrayResponse.prototype, "code", void 0);
    Object.defineProperty(WrappedArrayResponse, 'name', {
        value: `WrappedArray${DataType.name}`,
    });
    return WrappedArrayResponse;
}
//# sourceMappingURL=wrap-response.js.map