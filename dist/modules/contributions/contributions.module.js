"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContributionsModule = void 0;
const common_1 = require("@nestjs/common");
const contributions_service_1 = require("./contributions.service");
const prisma_module_1 = require("../../infrastructure/prisma/prisma.module");
const queue_module_1 = require("../../infrastructure/queue/queue.module");
const transactions_module_1 = require("../transactions/transactions.module");
const wallet_module_1 = require("../wallet/wallet.module");
const audit_module_1 = require("../../common/audit/audit.module");
const contributions_controller_1 = require("./contributions.controller");
let ContributionsModule = class ContributionsModule {
};
exports.ContributionsModule = ContributionsModule;
exports.ContributionsModule = ContributionsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, queue_module_1.QueueModule, transactions_module_1.TransactionsModule, wallet_module_1.WalletModule, audit_module_1.AuditModule],
        providers: [contributions_service_1.ContributionsService],
        controllers: [contributions_controller_1.ContributionsController],
        exports: [contributions_service_1.ContributionsService],
    })
], ContributionsModule);
//# sourceMappingURL=contributions.module.js.map