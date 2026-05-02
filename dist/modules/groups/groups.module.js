"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupsModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../infrastructure/prisma/prisma.module");
const queue_module_1 = require("../../infrastructure/queue/queue.module");
const notifications_module_1 = require("../notifications/notifications.module");
const users_module_1 = require("../users/users.module");
const redis_module_1 = require("../../infrastructure/redis/redis.module");
const transactions_module_1 = require("../transactions/transactions.module");
const group_service_1 = require("./group.service");
const group_contributor_service_1 = require("./group-contributor.service");
const group_join_service_1 = require("./group-join.service");
const group_lifecycle_service_1 = require("./group-lifecycle.service");
const group_invite_service_1 = require("./group-invite.service");
const contributor_swap_service_1 = require("./contributor-swap.service");
const group_controller_1 = require("./controllers/group.controller");
const group_contributor_controller_1 = require("./controllers/group-contributor.controller");
const group_join_controller_1 = require("./controllers/group-join.controller");
const group_invite_controller_1 = require("./controllers/group-invite.controller");
let GroupsModule = class GroupsModule {
};
exports.GroupsModule = GroupsModule;
exports.GroupsModule = GroupsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, queue_module_1.QueueModule, notifications_module_1.NotificationsModule, users_module_1.UsersModule, redis_module_1.RedisModule, transactions_module_1.TransactionsModule],
        providers: [group_service_1.GroupService, group_contributor_service_1.GroupContributorService, group_join_service_1.GroupJoinService, group_lifecycle_service_1.GroupLifecycleService, group_invite_service_1.GroupInviteService, contributor_swap_service_1.ContributorSwapService],
        controllers: [group_controller_1.GroupController, group_contributor_controller_1.GroupContributorController, group_contributor_controller_1.ContributorSwapController, group_join_controller_1.GroupJoinController, group_invite_controller_1.GroupInviteController, group_invite_controller_1.GroupJoinLinkController, group_invite_controller_1.InviteActionController, group_invite_controller_1.PublicInviteController, group_invite_controller_1.JoinLinkController],
        exports: [group_service_1.GroupService, group_contributor_service_1.GroupContributorService, group_invite_service_1.GroupInviteService],
    })
], GroupsModule);
//# sourceMappingURL=groups.module.js.map