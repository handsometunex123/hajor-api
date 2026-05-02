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
exports.PurgeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let PurgeService = class PurgeService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    onModuleInit() {
        const days = parseInt(this.config.get('SOFT_DELETE_RETENTION_DAYS', '90'), 10);
        const intervalMs = 24 * 60 * 60 * 1000;
        this.runPurge(days).catch((err) => console.error('Initial purge failed', err));
        setInterval(() => this.runPurge(days).catch((err) => console.error('Scheduled purge failed', err)), intervalMs);
    }
    async runPurge(days) {
        var _a;
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const ops = [
            { name: 'ContributionPayment', fn: () => this.prisma.contributionPayment.deleteMany({ where: { deletedAt: { lt: cutoff } } }) },
            { name: 'Transaction', fn: async () => this.prisma.$transaction(async (tx) => {
                    await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                    return tx.transaction.deleteMany({ where: { deletedAt: { lt: cutoff } } });
                }) },
            { name: 'AuditLog', fn: () => this.prisma.auditLog.deleteMany({ where: { deletedAt: { lt: cutoff } } }) },
            { name: 'ContributionCycle', fn: () => this.prisma.contributionCycle.deleteMany({ where: { deletedAt: { lt: cutoff } } }) },
            { name: 'GroupContributor', fn: () => this.prisma.groupContributor.deleteMany({ where: { deletedAt: { lt: cutoff } } }) },
            { name: 'Dispute', fn: () => this.prisma.dispute.deleteMany({ where: { deletedAt: { lt: cutoff } } }) },
            { name: 'Wallet', fn: async () => this.prisma.$transaction(async (tx) => {
                    await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                    return tx.wallet.deleteMany({ where: { deletedAt: { lt: cutoff } } });
                }) },
            { name: 'Group', fn: () => this.prisma.group.deleteMany({ where: { deletedAt: { lt: cutoff } } }) },
            { name: 'User', fn: () => this.prisma.user.deleteMany({ where: { deletedAt: { lt: cutoff } } }) },
        ];
        for (const op of ops) {
            try {
                const result = await op.fn();
                console.info(`Purged ${(_a = result.count) !== null && _a !== void 0 ? _a : result} rows from ${op.name}`);
            }
            catch (err) {
                console.error(`Purge failed for ${op.name}:`, (err === null || err === void 0 ? void 0 : err.message) || err);
            }
        }
    }
};
exports.PurgeService = PurgeService;
exports.PurgeService = PurgeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, config_1.ConfigService])
], PurgeService);
//# sourceMappingURL=purge.service.js.map