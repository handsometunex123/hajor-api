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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_guard_1 = require("../../modules/auth/jwt.guard");
const roles_guard_1 = require("../guards/roles.guard");
const roles_decorator_1 = require("../decorators/roles.decorator");
const audit_service_1 = require("./audit.service");
const audit_log_query_dto_1 = require("./dto/audit-log-query.dto");
let AuditController = class AuditController {
    constructor(auditService) {
        this.auditService = auditService;
    }
    async list(query) {
        return this.auditService.findAll(query);
    }
};
exports.AuditController = AuditController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List all audit log entries (SUPER_ADMIN only)',
        description: `
        Returns a paginated, sortable, filterable list of all audit log entries on the platform.

        **Filters available:**
        - \`actorId\` — UUID of the user who triggered the action. Pass \`null\` (string) to see only system-generated entries.
        - \`action\` — Exact action name, e.g. \`provision_va\`, \`send_otp\`, \`reconcile_deposit_success\`.
        - \`entityType\` — Exact entity type, e.g. \`User\`, \`Wallet\`, \`Transaction\`, \`Group\`, \`Invitation\`.
        - \`entityId\` — UUID of the specific entity affected.
        - \`search\` — Case-insensitive substring match on the \`action\` field.
        - \`from\` / \`to\` — ISO-8601 date range filter on \`createdAt\`.

        **Sorting:**
        - \`sortBy\`: \`createdAt\` (default) | \`action\` | \`entityType\` | \`actorId\`
        - \`sortOrder\`: \`desc\` (default) | \`asc\`
            `,
    }),
    openapi.ApiResponse({ status: 200, type: require("./dto/audit-log-response.dto").AuditLogListResponseDto }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_log_query_dto_1.AuditLogQueryDto]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "list", null);
exports.AuditController = AuditController = __decorate([
    (0, swagger_1.ApiTags)('Audit Logs'),
    (0, common_1.Controller)('audit-logs'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], AuditController);
//# sourceMappingURL=audit.controller.js.map