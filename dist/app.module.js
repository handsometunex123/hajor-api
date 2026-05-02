"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const audit_module_1 = require("./common/audit/audit.module");
const queue_module_1 = require("./infrastructure/queue/queue.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const transactions_module_1 = require("./modules/transactions/transactions.module");
const groups_module_1 = require("./modules/groups/groups.module");
const contributions_module_1 = require("./modules/contributions/contributions.module");
const payouts_module_1 = require("./modules/payouts/payouts.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const disputes_module_1 = require("./modules/disputes/disputes.module");
const fraud_module_1 = require("./modules/fraud/fraud.module");
const chat_module_1 = require("./modules/chat/chat.module");
const ticket_module_1 = require("./modules/tickets/ticket.module");
const throttler_1 = require("@nestjs/throttler");
const health_module_1 = require("./health/health.module");
const core_1 = require("@nestjs/core");
const jwt_guard_1 = require("./modules/auth/jwt.guard");
const prisma_module_1 = require("./infrastructure/prisma/prisma.module");
const maintenance_module_1 = require("./infrastructure/maintenance/maintenance.module");
const redis_module_1 = require("./infrastructure/redis/redis.module");
const monitoring_module_1 = require("./infrastructure/monitoring/monitoring.module");
const redis_throttler_storage_1 = require("./infrastructure/throttler/redis-throttler-storage");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            health_module_1.HealthModule,
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
            redis_module_1.RedisModule,
            monitoring_module_1.MonitoringModule,
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (config) => ({
                    throttlers: [
                        {
                            ttl: parseInt(config.get('RATE_TTL', '60')),
                            limit: parseInt(config.get('RATE_LIMIT', '100')),
                        },
                    ],
                }),
            }),
            audit_module_1.AuditModule,
            prisma_module_1.PrismaModule,
            maintenance_module_1.MaintenanceModule,
            queue_module_1.QueueModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            wallet_module_1.WalletModule,
            transactions_module_1.TransactionsModule,
            groups_module_1.GroupsModule,
            contributions_module_1.ContributionsModule,
            payouts_module_1.PayoutsModule,
            fraud_module_1.FraudModule,
            notifications_module_1.NotificationsModule,
            disputes_module_1.DisputesModule,
            chat_module_1.ChatModule,
            ticket_module_1.TicketModule,
        ],
        controllers: [],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_guard_1.JwtAuthGuard,
            },
            {
                provide: throttler_1.ThrottlerStorage,
                useClass: redis_throttler_storage_1.RedisThrottlerStorage,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map