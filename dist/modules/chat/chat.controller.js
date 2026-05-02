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
exports.ChatController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_guard_1 = require("../auth/jwt.guard");
const chat_service_1 = require("./chat.service");
const send_message_dto_1 = require("./dto/send-message.dto");
const list_query_dto_1 = require("../../common/dto/list-query.dto");
const ok_response_dto_1 = require("../../common/dto/ok-response.dto");
const conversation_response_dto_1 = require("./dto/conversation-response.dto");
const message_response_dto_1 = require("./dto/message-response.dto");
const messages_list_response_dto_1 = require("./dto/messages-list-response.dto");
const conversations_list_response_dto_1 = require("./dto/conversations-list-response.dto");
let ChatController = class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
    }
    async getOrCreateConversation(req, groupId) {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.chatService.getOrCreateConversation(groupId, userId);
    }
    async sendMessage(req, conversationId, dto) {
        var _a;
        const senderId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.chatService.sendMessage(senderId, conversationId, dto.content);
    }
    async getMessages(req, conversationId, query) {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.chatService.getConversationMessages(userId, conversationId, { page: query.page, limit: query.limit, sortBy: query.sortBy, sortOrder: query.sortOrder });
    }
    async update(req, conversationId) {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.chatService.markMessagesAsRead(userId, conversationId);
    }
    async getGroupConversations(req, groupId, query) {
        var _a;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.chatService.getAdminConversations(adminId, groupId, { page: query.page, limit: query.limit, sortBy: query.sortBy, sortOrder: query.sortOrder });
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)('groups/:groupId/conversations'),
    (0, swagger_1.ApiOperation)({ summary: 'Get or create conversation between user and group admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Conversation created/retrieved', type: conversation_response_dto_1.ConversationResponseDto }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getOrCreateConversation", null);
__decorate([
    (0, common_1.Post)('conversations/:conversationId/messages'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a message in a conversation' }),
    (0, swagger_1.ApiBody)({ type: send_message_dto_1.SendMessageDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Message sent', type: message_response_dto_1.MessageResponseDto }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('conversationId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, send_message_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('conversations/:conversationId/messages'),
    (0, swagger_1.ApiOperation)({ summary: 'Get messages in a conversation' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Conversation messages', type: messages_list_response_dto_1.MessagesListResponseDto }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('conversationId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, list_query_dto_1.ListQueryDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Patch)('conversations/:conversationId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update conversation (mark messages as read)' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { lastReadAt: { type: 'string', format: 'date-time' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Conversation updated', type: ok_response_dto_1.OkResponseDto }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('conversationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('groups/:groupId/conversations'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all conversations for a group (admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group conversations', type: conversations_list_response_dto_1.ConversationsListResponseDto }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, list_query_dto_1.ListQueryDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getGroupConversations", null);
exports.ChatController = ChatController = __decorate([
    (0, swagger_1.ApiTags)('Chat'),
    (0, common_1.Controller)('chat'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map