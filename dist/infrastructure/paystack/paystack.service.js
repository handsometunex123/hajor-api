"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PaystackService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
let PaystackService = PaystackService_1 = class PaystackService {
    constructor() {
        this.logger = new common_1.Logger(PaystackService_1.name);
        this.base = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
        this.sk = process.env.PAYSTACK_SECRET_KEY || '';
        this.webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET || '';
    }
    headers() {
        return { Authorization: `Bearer ${this.sk}`, 'Content-Type': 'application/json' };
    }
    verifySignature(rawBody, signatureHeader) {
        if (!this.webhookSecret) {
            this.logger.warn('PAYSTACK_WEBHOOK_SECRET not configured — webhook signature cannot be verified; request will be rejected');
            return false;
        }
        if (!signatureHeader)
            return false;
        try {
            const computed = crypto.createHmac('sha512', this.webhookSecret).update(rawBody).digest('hex');
            return computed === signatureHeader;
        }
        catch (err) {
            this.logger.warn('Error verifying paystack signature', (err === null || err === void 0 ? void 0 : err.message) || err);
            return false;
        }
    }
    async initiateCharge({ email, amount, reference, callback_url }) {
        const url = `${this.base}/transaction/initialize`;
        const data = { email, amount: typeof amount === 'number' ? Math.round(amount * 100) : amount, reference, callback_url };
        const res = await axios_1.default.post(url, data, { headers: this.headers() });
        return res.data;
    }
    async initiateTransfer({ source = 'balance', amount, recipient, reference, reason }) {
        const url = `${this.base}/transfer`;
        const data = { source, amount: typeof amount === 'number' ? Math.round(amount * 100) : amount, recipient, reference, reason };
        const res = await axios_1.default.post(url, data, { headers: this.headers() });
        return res.data;
    }
    async getTransaction(reference) {
        const url = `${this.base}/transaction/verify/${reference}`;
        const res = await axios_1.default.get(url, { headers: this.headers() });
        return res.data;
    }
};
exports.PaystackService = PaystackService;
exports.PaystackService = PaystackService = PaystackService_1 = __decorate([
    (0, common_1.Injectable)()
], PaystackService);
//# sourceMappingURL=paystack.service.js.map