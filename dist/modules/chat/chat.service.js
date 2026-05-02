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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const chat_gateway_1 = require("./chat.gateway");
let ChatService = class ChatService {
    constructor(prisma, chatGateway) {
        this.prisma = prisma;
        this.chatGateway = chatGateway;
    }
    async getOrCreateConversation(groupId, userId) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        let conversation = await this.prisma.conversation.findUnique({ where: { groupId_userId: { groupId, userId } } });
        if (!conversation) {
            conversation = await this.prisma.conversation.create({ data: { groupId, userId } });
        }
        return conversation;
    }
    async sendMessage(senderId, conversationId, content) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { group: true, user: true }
        });
        if (!conversation)
            throw new common_1.NotFoundException('Conversation not found');
        const isAdmin = conversation.group.adminId === senderId;
        const isParticipant = conversation.userId === senderId;
        if (!isAdmin && !isParticipant) {
            throw new common_1.ForbiddenException('You are not authorized to send messages in this conversation');
        }
        const message = await this.prisma.message.create({
            data: {
                conversationId,
                senderId,
                content,
                type: 'TEXT',
            },
            include: {
                sender: {
                    select: { id: true, firstName: true, lastName: true }
                }
            }
        });
        this.chatGateway.emitNewMessage(conversationId, message);
        return message;
    }
    async getConversationMessages(userId, conversationId, opts = {}) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { group: true }
        });
        if (!conversation)
            throw new common_1.NotFoundException('Conversation not found');
        const isAdmin = conversation.group.adminId === userId;
        const isParticipant = conversation.userId === userId;
        if (!isAdmin && !isParticipant) {
            throw new common_1.ForbiddenException('You are not authorized to view this conversation');
        }
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 50;
        const skip = (page - 1) * limit;
        const allowedSortFields = ['createdAt'];
        const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
        const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';
        const [messages, total] = await Promise.all([
            this.prisma.message.findMany({
                where: { conversationId },
                include: {
                    sender: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
            }),
            this.prisma.message.count({ where: { conversationId } }),
        ]);
        return {
            data: messages,
            pagination: {
                total,
                page,
                limit,
                pages: Math.max(1, Math.ceil(total / limit)),
            },
        };
    }
    async markMessagesAsRead(userId, conversationId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { group: true }
        });
        if (!conversation)
            throw new common_1.NotFoundException('Conversation not found');
        const isAdmin = conversation.group.adminId === userId;
        const isParticipant = conversation.userId === userId;
        if (!isAdmin && !isParticipant) {
            throw new common_1.ForbiddenException('You are not authorized');
        }
        const readAt = new Date();
        await this.prisma.message.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                isRead: false,
            },
            data: { isRead: true },
        });
        this.chatGateway.emitMessagesRead(conversationId, { userId, readAt });
        return { success: true };
    }
    async getAdminConversations(adminId, groupId, opts = {}) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.adminId !== adminId)
            throw new common_1.ForbiddenException('Only admin can view group conversations');
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 50;
        const skip = (page - 1) * limit;
        const allowedSortFields = ['createdAt', 'updatedAt'];
        const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'updatedAt';
        const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';
        const [conversations, total] = await Promise.all([
            this.prisma.conversation.findMany({
                where: { groupId },
                include: {
                    user: {
                        select: { id: true, firstName: true, lastName: true, email: true }
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: { id: true, content: true, createdAt: true, isRead: true },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
            }),
            this.prisma.conversation.count({ where: { groupId } }),
        ]);
        const conversationsWithUnread = await Promise.all(conversations.map(async (c) => {
            const unreadCount = await this.prisma.message.count({
                where: {
                    conversationId: c.id,
                    senderId: { not: adminId },
                    isRead: false,
                },
            });
            return {
                id: c.id,
                groupId: c.groupId,
                userId: c.userId,
                user: c.user,
                lastMessage: c.messages[0] || undefined,
                unreadCount,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
            };
        }));
        return {
            data: conversationsWithUnread,
            pagination: {
                total,
                page,
                limit,
                pages: Math.max(1, Math.ceil(total / limit)),
            },
        };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => chat_gateway_1.ChatGateway))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        chat_gateway_1.ChatGateway])
], ChatService);
//# sourceMappingURL=chat.service.js.map