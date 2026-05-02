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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var KycService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KycService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
let KycService = KycService_1 = class KycService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(KycService_1.name);
    }
    async verifyBvn(bvn, payload = {}) {
        var _a;
        if (process.env.NODE_ENV === 'development') {
            return {
                success: true,
                data: {
                    verificationId: 'dev-' + Math.random().toString(36).substring(2, 12).toUpperCase(),
                    firstName: payload.firstName || 'John',
                    lastName: payload.lastName || 'Doe',
                    dateOfBirth: payload.dob || '1990-01-01',
                }
            };
        }
        const url = this.config.get('KYC_PROVIDER_URL');
        const apiKey = this.config.get('KYC_PROVIDER_KEY');
        try {
            const body = { bvn, ...payload };
            const headers = { 'Content-Type': 'application/json' };
            if (apiKey)
                headers['Authorization'] = `Bearer ${apiKey}`;
            const resp = await axios_1.default.post(url, body, { headers, timeout: 10000 });
            const data = resp === null || resp === void 0 ? void 0 : resp.data;
            let success = false;
            let verificationId = (data === null || data === void 0 ? void 0 : data.verificationId) || (data === null || data === void 0 ? void 0 : data.referenceId) || (data === null || data === void 0 ? void 0 : data.ref) || (data === null || data === void 0 ? void 0 : data.id) || null;
            if (typeof (data === null || data === void 0 ? void 0 : data.verified) === 'boolean')
                success = data.verified;
            else if ((data === null || data === void 0 ? void 0 : data.status) && typeof data.status === 'string') {
                success = ['valid', 'verified', 'success'].includes(data.status.toLowerCase());
            }
            else if ((data === null || data === void 0 ? void 0 : data.matched) === true)
                success = true;
            if (!success && (resp === null || resp === void 0 ? void 0 : resp.status) && resp.status >= 200 && resp.status < 300)
                success = true;
            if (!verificationId)
                verificationId = (data === null || data === void 0 ? void 0 : data.id) || (data === null || data === void 0 ? void 0 : data.reference) || (data === null || data === void 0 ? void 0 : data.transactionId) || null;
            if (!verificationId)
                verificationId = 'ext-' + Math.random().toString(36).substring(2, 12).toUpperCase();
            const firstName = (data === null || data === void 0 ? void 0 : data.firstName) || (data === null || data === void 0 ? void 0 : data.firstname) || (data === null || data === void 0 ? void 0 : data.first_name) || null;
            const lastName = (data === null || data === void 0 ? void 0 : data.lastName) || (data === null || data === void 0 ? void 0 : data.lastname) || (data === null || data === void 0 ? void 0 : data.last_name) || null;
            const dateOfBirth = (data === null || data === void 0 ? void 0 : data.dateOfBirth) || (data === null || data === void 0 ? void 0 : data.dob) || (data === null || data === void 0 ? void 0 : data.date_of_birth) || null;
            return { success, data: { verificationId, firstName, lastName, dateOfBirth } };
        }
        catch (err) {
            this.logger.warn('KYC provider call failed, returning dev verificationId', (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err);
            return {
                success: false,
                data: {
                    verificationId: 'dev-' + Math.random().toString(36).substring(2, 12).toUpperCase(),
                    firstName: payload.firstName || null,
                    lastName: payload.lastName || null,
                    dateOfBirth: payload.dateOfBirth || null,
                }
            };
        }
    }
};
exports.KycService = KycService;
exports.KycService = KycService = KycService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], KycService);
//# sourceMappingURL=kyc.service.js.map