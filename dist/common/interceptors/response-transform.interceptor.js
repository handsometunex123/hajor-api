"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseTransformInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const client_1 = require("@prisma/client");
function serializeDecimals(value, seen = new WeakSet()) {
    if (value === null || value === undefined)
        return value;
    if (client_1.Prisma.Decimal.isDecimal(value))
        return value.toNumber();
    if (value instanceof Date)
        return value.toISOString();
    if (Array.isArray(value))
        return value.map((v) => serializeDecimals(v, seen));
    if (typeof value === 'object') {
        if (Object.prototype.toString.call(value) === '[object Object]') {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
            const out = {};
            for (const [k, v] of Object.entries(value)) {
                out[k] = serializeDecimals(v, seen);
            }
            seen.delete(value);
            return out;
        }
        return value;
    }
    return value;
}
let ResponseTransformInterceptor = class ResponseTransformInterceptor {
    intercept(context, next) {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        return next.handle().pipe((0, operators_1.map)((data) => {
            var _a;
            if (data && data._standardResponse)
                return data;
            const statusCode = (response === null || response === void 0 ? void 0 : response.statusCode) || 200;
            const payload = {
                statusCode,
                timestamp: new Date().toISOString(),
                path: request === null || request === void 0 ? void 0 : request.url,
                requestId: (request === null || request === void 0 ? void 0 : request.id) || ((_a = request === null || request === void 0 ? void 0 : request.headers) === null || _a === void 0 ? void 0 : _a['x-request-id']) || null,
                data: serializeDecimals(data === undefined ? null : data),
                code: statusCode === 200 ? 'OK' : `E${statusCode}`,
            };
            return payload;
        }));
    }
};
exports.ResponseTransformInterceptor = ResponseTransformInterceptor;
exports.ResponseTransformInterceptor = ResponseTransformInterceptor = __decorate([
    (0, common_1.Injectable)()
], ResponseTransformInterceptor);
//# sourceMappingURL=response-transform.interceptor.js.map