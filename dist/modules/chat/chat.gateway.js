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
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
let ChatGateway = class ChatGateway {
    constructor(jwtService, prisma) {
        this.jwtService = jwtService;
        this.prisma = prisma;
    }
    async handleConnection(client) {
        var _a, _b;
        try {
            const token = ((_a = client.handshake.auth) === null || _a === void 0 ? void 0 : _a.token) || ((_b = client.handshake.query) === null || _b === void 0 ? void 0 : _b.token);
            if (!token) {
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token);
            client.userId = payload.id;
            console.log(`Client connected: ${client.id}, User: ${client.userId}`);
        }
        catch (error) {
            console.error('WebSocket authentication failed:', error);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
    }
    async handleJoinConversation(client, data) {
        try {
            if (!client.userId) {
                return { error: 'Unauthorized' };
            }
            const conversation = await this.prisma.conversation.findUnique({
                where: { id: data.conversationId },
                include: { group: true },
            });
            if (!conversation) {
                return { error: 'Conversation not found' };
            }
            const isParticipant = conversation.userId === client.userId;
            const isAdmin = conversation.group.adminId === client.userId;
            if (!isParticipant && !isAdmin) {
                return { error: 'Access denied' };
            }
            client.join(`conversation:${data.conversationId}`);
            console.log(`User ${client.userId} joined conversation ${data.conversationId}`);
            return { success: true, conversationId: data.conversationId };
        }
        catch (error) {
            console.error('Error joining conversation:', error);
            return { error: 'Failed to join conversation' };
        }
    }
    async handleLeaveConversation(client, data) {
        client.leave(`conversation:${data.conversationId}`);
        console.log(`User ${client.userId} left conversation ${data.conversationId}`);
        return { success: true };
    }
    async handleTyping(client, data) {
        client.to(`conversation:${data.conversationId}`).emit('user_typing', {
            userId: client.userId,
            conversationId: data.conversationId,
            isTyping: data.isTyping,
        });
    }
    emitNewMessage(conversationId, message) {
        this.server.to(`conversation:${conversationId}`).emit('new_message', message);
    }
    emitMessagesRead(conversationId, data) {
        this.server.to(`conversation:${conversationId}`).emit('messages_read', data);
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_conversation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_conversation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleLeaveConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleTyping", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            credentials: true,
        },
        namespace: '/chat',
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map