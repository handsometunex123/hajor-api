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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FraudService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const crypto = __importStar(require("crypto"));
let FraudService = FraudService_1 = class FraudService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(FraudService_1.name);
    }
    hashIdentifier(value) {
        return crypto.createHash('sha256').update(String(value)).digest('hex');
    }
    async checkMultipleAccounts(identifierType, value) {
        const h = this.hashIdentifier(value);
        const matches = await this.prisma.userIdentifier.findMany({ where: { type: identifierType, valueHash: h }, include: { user: true } });
        if (matches.length > 1) {
            this.logger.warn(`Multiple accounts detected for ${identifierType}`);
            const flags = [];
            for (const m of matches) {
                const f = await this.prisma.fraudFlag.create({ data: { userId: m.userId, reason: `Multiple accounts for ${identifierType}`, severity: 'HIGH', metadata: { identifierType } } });
                flags.push(f);
            }
            return { flagged: true, flags };
        }
        return { flagged: false, count: matches.length };
    }
    async checkDefaultRate(userId, lookbackCycles = 6, threshold = 3) {
        const payments = await this.prisma.contributionPayment.findMany({ where: { groupContributor: { userId } }, orderBy: { createdAt: 'desc' }, take: 200 });
        const defaults = payments.filter((p) => p.status !== 'PAID');
        if (defaults.length >= threshold) {
            const flag = await this.prisma.fraudFlag.create({ data: { userId, reason: `Frequent defaults: ${defaults.length}`, severity: 'HIGH', metadata: { defaults: defaults.length } } });
            return { flagged: true, flag };
        }
        return { flagged: false, defaults: defaults.length };
    }
    async flagUser(userId, reason, severity = 'LOW', metadata) {
        return this.prisma.fraudFlag.create({ data: { userId, reason, severity, metadata } });
    }
    async flagGroup(groupId, reason, severity = 'LOW', metadata) {
        return this.prisma.fraudFlag.create({ data: { groupId, reason, severity, metadata } });
    }
    async listFlags(opts = {}) {
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 50;
        const where = {};
        if (opts.status)
            where.status = opts.status;
        const allowedSortFields = ['createdAt', 'severity', 'status'];
        const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
        const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';
        const [flags, total] = await Promise.all([
            this.prisma.fraudFlag.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            this.prisma.fraudFlag.count({ where }),
        ]);
        return {
            items: flags,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit) || 1,
            },
        };
    }
    async reviewFlag(flagId, reviewerId, status = 'REVIEWED', metadata) {
        const updated = await this.prisma.fraudFlag.update({ where: { id: flagId }, data: { status, metadata: Object.assign({}, metadata || {}, { reviewedBy: reviewerId }) } });
        return updated;
    }
};
exports.FraudService = FraudService;
exports.FraudService = FraudService = FraudService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FraudService);
exports.default = FraudService;
//# sourceMappingURL=fraud.service.js.map