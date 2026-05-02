"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const alert_1 = require("../monitoring/alert");
let PrismaService = class PrismaService extends client_1.PrismaClient {
    async onModuleInit() {
        var _a;
        const pool = process.env.DB_POOL || process.env.PRISMA_POOL || 'default';
        try {
            await this.$connect();
            console.info(`Prisma connected (pool=${pool})`);
        }
        catch (err) {
            console.error(`Prisma connection failed (pool=${pool}): ${(_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err}. App will keep running and retry on first query.`);
        }
        this.$use(async (params, next) => {
            const guardedModels = ['Transaction', 'Wallet'];
            const writeActions = ['create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany'];
            try {
                if (params.model && guardedModels.includes(params.model) && writeActions.includes(params.action)) {
                    const isInternal = params.args && Object.prototype.hasOwnProperty.call(params.args, '_internal') && params.args._internal === true;
                    if (!isInternal) {
                        try {
                            await (0, alert_1.sendAlert)('Forbidden DB write attempt', { model: params.model, action: params.action });
                        }
                        catch (_) { }
                        throw new Error(`Direct writes to ${params.model} are forbidden. Use internal service APIs.`);
                    }
                    try {
                        delete params.args._internal;
                    }
                    catch (_) { }
                }
                const softDeleteModels = new Set([
                    'User', 'Wallet', 'Transaction', 'Group', 'GroupContributor',
                    'ContributionCycle', 'ContributionPayment', 'Dispute', 'AuditLog',
                ]);
                const actionsToFilter = ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate'];
                if (!params.model || !actionsToFilter.includes(params.action) || !softDeleteModels.has(params.model)) {
                    return await next(params);
                }
                if (params.args && params.args.includeDeleted) {
                    delete params.args.includeDeleted;
                    return await next(params);
                }
                params.args = params.args || {};
                if (params.action === 'findUnique') {
                    params.action = 'findFirst';
                }
                if (params.args.where) {
                    const where = params.args.where;
                    if (!Object.prototype.hasOwnProperty.call(where, 'deletedAt')) {
                        params.args.where = { AND: [where, { deletedAt: null }] };
                    }
                }
                else {
                    params.args.where = { deletedAt: null };
                }
                return await next(params);
            }
            catch (err) {
                const msg = (err === null || err === void 0 ? void 0 : err.message) || '';
                if (msg.includes('Direct writes to guarded table') || msg.includes('Direct writes to')) {
                    try {
                        await (0, alert_1.sendAlert)('DB Guard triggered: forbidden write', { model: params.model, action: params.action, error: msg });
                    }
                    catch (_) { }
                }
                throw err;
            }
        });
    }
    async enableShutdownHooks(app) {
        this.$on('beforeExit', async () => {
            await app.close();
        });
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)()
], PrismaService);
//# sourceMappingURL=prisma.service.js.map