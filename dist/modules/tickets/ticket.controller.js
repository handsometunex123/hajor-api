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
exports.TicketController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/jwt.guard");
const ticket_service_1 = require("./ticket.service");
const create_ticket_dto_1 = require("./dto/create-ticket.dto");
const update_ticket_status_dto_1 = require("./dto/update-ticket-status.dto");
const ticket_response_dto_1 = require("./dto/ticket-response.dto");
const ticket_detail_response_dto_1 = require("./dto/ticket-detail-response.dto");
const paginated_user_tickets_response_dto_1 = require("./dto/paginated-user-tickets-response.dto");
const paginated_group_tickets_response_dto_1 = require("./dto/paginated-group-tickets-response.dto");
const list_query_dto_1 = require("../../common/dto/list-query.dto");
const swagger_1 = require("@nestjs/swagger");
let TicketController = class TicketController {
    constructor(ticketService) {
        this.ticketService = ticketService;
    }
    async create(req, dto) {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.ticketService.createTicket(userId, dto);
    }
    async getTicket(id) {
        return this.ticketService.getTicket(id);
    }
    async getMyTickets(req, query, status, type) {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.ticketService.getUserTickets(userId, { page: query.page, limit: query.limit, status, type, sortBy: query.sortBy, sortOrder: query.sortOrder });
    }
    async getGroupTickets(req, groupId, query, status, type) {
        var _a;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.ticketService.getGroupTickets(groupId, adminId, { page: query.page, limit: query.limit, status, type, sortBy: query.sortBy, sortOrder: query.sortOrder });
    }
    async updateStatus(req, id, dto) {
        var _a;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.ticketService.updateTicketStatus(id, adminId, dto);
    }
};
exports.TicketController = TicketController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a ticket (contributor replacement or leave group)' }),
    (0, swagger_1.ApiBody)({ type: create_ticket_dto_1.CreateTicketDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Ticket created', type: ticket_response_dto_1.TicketResponseDto }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_ticket_dto_1.CreateTicketDto]),
    __metadata("design:returntype", Promise)
], TicketController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get ticket details' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Ticket details', type: ticket_detail_response_dto_1.TicketDetailResponseDto }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TicketController.prototype, "getTicket", null);
__decorate([
    (0, common_1.Get)('mine'),
    (0, swagger_1.ApiOperation)({ summary: 'Get my tickets' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED'] }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, enum: ['CONTRIBUTOR_REPLACEMENT', 'LEAVE_GROUP', 'DISPUTE', 'CYCLE_RESCHEDULE', 'OTHER'] }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User tickets', type: paginated_user_tickets_response_dto_1.PaginatedUserTicketsResponseDto }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_query_dto_1.ListQueryDto, String, String]),
    __metadata("design:returntype", Promise)
], TicketController.prototype, "getMyTickets", null);
__decorate([
    (0, common_1.Get)('groups/:groupId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all tickets for a group (admin only)' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED'] }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, enum: ['CONTRIBUTOR_REPLACEMENT', 'LEAVE_GROUP', 'DISPUTE', 'CYCLE_RESCHEDULE', 'OTHER'] }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group tickets', type: paginated_group_tickets_response_dto_1.PaginatedGroupTicketsResponseDto }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, list_query_dto_1.ListQueryDto, String, String]),
    __metadata("design:returntype", Promise)
], TicketController.prototype, "getGroupTickets", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update ticket status (admin only)' }),
    (0, swagger_1.ApiBody)({ type: update_ticket_status_dto_1.UpdateTicketStatusDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Ticket updated', type: ticket_response_dto_1.TicketResponseDto }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_ticket_status_dto_1.UpdateTicketStatusDto]),
    __metadata("design:returntype", Promise)
], TicketController.prototype, "updateStatus", null);
exports.TicketController = TicketController = __decorate([
    (0, swagger_1.ApiTags)('Tickets'),
    (0, common_1.Controller)('tickets'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ticket_service_1.TicketService])
], TicketController);
//# sourceMappingURL=ticket.controller.js.map