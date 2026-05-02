"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicInviteController = exports.JoinLinkController = exports.InviteActionController = exports.GroupJoinLinkController = exports.GroupInviteController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../../../common/decorators/public.decorator");
const express_1 = require("express");
const config_1 = require("@nestjs/config");
const jwt_guard_1 = require("../../auth/jwt.guard");
const group_invite_service_1 = require("../group-invite.service");
const users_service_1 = require("../../users/users.service");
const onboard_invite_dto_1 = require("../../users/dto/onboard-invite.dto");
const create_invite_dto_1 = require("../dto/create-invite.dto");
const create_contact_invite_dto_1 = require("../dto/create-contact-invite.dto");
const proxy_register_init_dto_1 = require("../dto/proxy-register-init.dto");
const proxy_register_confirm_dto_1 = require("../dto/proxy-register-confirm.dto");
const id_response_dto_1 = require("../../../common/dto/id-response.dto");
const list_query_dto_1 = require("../../../common/dto/list-query.dto");
const ok_response_dto_1 = require("../../../common/dto/ok-response.dto");
const join_link_response_dto_1 = require("../dto/join-link-response.dto");
const invite_list_response_dto_1 = require("../dto/invite-list-response.dto");
const invite_list_query_dto_1 = require("../dto/invite-list-query.dto");
const swagger_1 = require("@nestjs/swagger");
const wrap_response_1 = require("../../../common/dto/wrap-response");
const QRCode = __importStar(require("qrcode"));
let GroupInviteController = class GroupInviteController {
    constructor(svc, config) {
        this.svc = svc;
        this.config = config;
    }
    async invite(req, groupId, body) {
        var _a;
        return this.svc.createInvite((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, groupId, body.userId);
    }
    async inviteContact(req, groupId, body) {
        var _a;
        return this.svc.createContactInvite((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, groupId, { firstName: body.firstName, lastName: body.lastName, email: body.email, phone: body.phone });
    }
    async list(req, groupId, query) {
        var _a;
        return this.svc.listPendingInvites((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, groupId, { page: query.page, limit: query.limit, search: query.search, sortBy: query.sortBy, sortOrder: query.sortOrder });
    }
    async proxyRegisterInit(req, groupId, body) {
        var _a;
        return this.svc.proxyRegisterInit((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, groupId, body);
    }
    async proxyRegisterConfirm(req, groupId, body) {
        var _a;
        return this.svc.proxyRegisterConfirm((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, groupId, body);
    }
};
exports.GroupInviteController = GroupInviteController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Invite a user to the group' }),
    (0, swagger_1.ApiBody)({ type: create_invite_dto_1.CreateInviteDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Invite created', type: (0, wrap_response_1.wrapResponse)(id_response_dto_1.IdResponseDto) }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_invite_dto_1.CreateInviteDto]),
    __metadata("design:returntype", Promise)
], GroupInviteController.prototype, "invite", null);
__decorate([
    (0, common_1.Post)('contact'),
    (0, swagger_1.ApiOperation)({ summary: 'Invite a non-app user by contact info (sends OTP)' }),
    (0, swagger_1.ApiBody)({ type: create_contact_invite_dto_1.CreateContactInviteDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Contact invite created', type: (0, wrap_response_1.wrapResponse)(id_response_dto_1.IdResponseDto) }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_contact_invite_dto_1.CreateContactInviteDto]),
    __metadata("design:returntype", Promise)
], GroupInviteController.prototype, "inviteContact", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List pending invites for group' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of invites', type: (0, wrap_response_1.wrapResponse)(invite_list_response_dto_1.InviteListResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, list_query_dto_1.ListQueryDto]),
    __metadata("design:returntype", Promise)
], GroupInviteController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('proxy-registrations/init'),
    (0, swagger_1.ApiOperation)({
        summary: 'Step 1 – Admin initiates proxy registration: sends OTP via SMS to the user',
        description: 'An OTP is sent to the provided phone number. The user reads the OTP back to the admin verbally, confirming consent before the admin proceeds to confirm.',
    }),
    (0, swagger_1.ApiBody)({ type: proxy_register_init_dto_1.ProxyRegisterInitDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP dispatched', schema: { example: { message: 'OTP sent to user phone', phone: '+2348012345678', expiresInSeconds: 600 } } }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, proxy_register_init_dto_1.ProxyRegisterInitDto]),
    __metadata("design:returntype", Promise)
], GroupInviteController.prototype, "proxyRegisterInit", null);
__decorate([
    (0, common_1.Post)('proxy-registrations/confirm'),
    (0, swagger_1.ApiOperation)({
        summary: 'Step 2 – Admin confirms OTP read back by user, completing proxy registration',
        description: 'Validates the OTP, creates the user account (role: PROXY, notificationChannel: SMS), provisions a wallet, adds the user to the group, and sends a temporary password via SMS.',
    }),
    (0, swagger_1.ApiBody)({ type: proxy_register_confirm_dto_1.ProxyRegisterConfirmDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Proxy user created and added to group' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, proxy_register_confirm_dto_1.ProxyRegisterConfirmDto]),
    __metadata("design:returntype", Promise)
], GroupInviteController.prototype, "proxyRegisterConfirm", null);
exports.GroupInviteController = GroupInviteController = __decorate([
    (0, swagger_1.ApiTags)('Groups'),
    (0, common_1.Controller)('groups/:groupId/invitations'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [group_invite_service_1.GroupInviteService, config_1.ConfigService])
], GroupInviteController);
let GroupJoinLinkController = class GroupJoinLinkController {
    constructor(svc, config) {
        this.svc = svc;
        this.config = config;
    }
    buildUrl(token) {
        const frontend = (this.config.get('FRONTEND_URL') || 'https://app.example.com').replace(/\/+$/, '');
        return `${frontend}/join/${token}`;
    }
    async upsert(req, groupId) {
        var _a;
        const link = await this.svc.upsertJoinLink((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, groupId);
        return { url: this.buildUrl(link.token), token: link.token };
    }
    async get(req, groupId) {
        var _a;
        const link = await this.svc.getJoinLink((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, groupId);
        return { url: this.buildUrl(link.token), token: link.token };
    }
    async qrcode(req, groupId, res) {
        var _a;
        const link = await this.svc.getJoinLink((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, groupId);
        const qrBuffer = await QRCode.toBuffer(this.buildUrl(link.token), { type: 'png', width: 300, margin: 2, errorCorrectionLevel: 'M' });
        res.set('Content-Type', 'image/png');
        res.set('Content-Disposition', `inline; filename="group-${groupId}-qrcode.png"`);
        res.send(qrBuffer);
    }
    async updateStatus(req, groupId, body) {
        var _a, _b;
        if (body.status === 'PAUSED')
            return this.svc.pauseJoinLink((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, groupId);
        if (body.status === 'ACTIVE')
            return this.svc.resumeJoinLink((_b = req.user) === null || _b === void 0 ? void 0 : _b.id, groupId);
        throw new common_1.BadRequestException('status must be PAUSED or ACTIVE');
    }
    async revoke(req, groupId) {
        var _a;
        return this.svc.revokeJoinLink((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, groupId);
    }
};
exports.GroupJoinLinkController = GroupJoinLinkController;
__decorate([
    (0, common_1.Put)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Create or regenerate the group join link',
        description: 'Admin-only. Creates the join link if none exists. If one already exists its token is rotated. Use this single endpoint instead of separate create/regenerate calls.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Join link created or regenerated', type: (0, wrap_response_1.wrapResponse)(join_link_response_dto_1.JoinLinkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GroupJoinLinkController.prototype, "upsert", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get the active join link', description: 'Available to the group admin and any existing contributor.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Current join link', type: (0, wrap_response_1.wrapResponse)(join_link_response_dto_1.JoinLinkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GroupJoinLinkController.prototype, "get", null);
__decorate([
    (0, common_1.Get)('qrcode'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a QR code PNG for the current join link' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'QR code image (PNG)', schema: { type: 'string', format: 'binary' } }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, typeof (_a = typeof express_1.Response !== "undefined" && express_1.Response) === "function" ? _a : Object]),
    __metadata("design:returntype", Promise)
], GroupJoinLinkController.prototype, "qrcode", null);
__decorate([
    (0, common_1.Patch)(),
    (0, swagger_1.ApiOperation)({ summary: 'Pause or resume the join link', description: 'Admin-only. A paused link rejects new join attempts without being deleted.' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { status: { type: 'string', enum: ['PAUSED', 'ACTIVE'] } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Status updated', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], GroupJoinLinkController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke the join link', description: 'Admin-only. Hard-deletes the link. Use PUT to issue a fresh one afterwards.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Link revoked', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GroupJoinLinkController.prototype, "revoke", null);
exports.GroupJoinLinkController = GroupJoinLinkController = __decorate([
    (0, swagger_1.ApiTags)('Groups'),
    (0, common_1.Controller)('groups/:groupId/join-link'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [group_invite_service_1.GroupInviteService, config_1.ConfigService])
], GroupJoinLinkController);
let InviteActionController = class InviteActionController {
    constructor(svc) {
        this.svc = svc;
    }
    async listMine(req, query) {
        var _a;
        return this.svc.listMyInvites((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, { page: query.page, limit: query.limit, status: query.status, sortBy: query.sortBy, sortOrder: query.sortOrder });
    }
    async updateStatus(req, id, body) {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (body.status === 'ACCEPTED')
            return this.svc.acceptInvite(userId, id);
        if (body.status === 'REJECTED')
            return this.svc.rejectInvite(userId, id);
        throw new common_1.BadRequestException('status must be ACCEPTED or REJECTED');
    }
};
exports.InviteActionController = InviteActionController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List my received invitations' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of invitations' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, invite_list_query_dto_1.InviteListQueryDto]),
    __metadata("design:returntype", Promise)
], InviteActionController.prototype, "listMine", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Accept or reject an invite' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { status: { type: 'string', enum: ['ACCEPTED', 'REJECTED'] } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Invite updated', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], InviteActionController.prototype, "updateStatus", null);
exports.InviteActionController = InviteActionController = __decorate([
    (0, swagger_1.ApiTags)('Invitations'),
    (0, common_1.Controller)('invitations'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [group_invite_service_1.GroupInviteService])
], InviteActionController);
let JoinLinkController = class JoinLinkController {
    constructor(svc) {
        this.svc = svc;
    }
    async consume(req, token) {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        return this.svc.consumeJoinLink(userId, token);
    }
};
exports.JoinLinkController = JoinLinkController;
__decorate([
    (0, common_1.Post)(':token'),
    (0, swagger_1.ApiOperation)({ summary: 'Join a group using a join link token' }),
    (0, swagger_1.ApiParam)({ name: 'token', description: 'The join link token' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Successfully joined the group', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], JoinLinkController.prototype, "consume", null);
exports.JoinLinkController = JoinLinkController = __decorate([
    (0, swagger_1.ApiTags)('Groups'),
    (0, common_1.Controller)('join'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [group_invite_service_1.GroupInviteService])
], JoinLinkController);
let PublicInviteController = class PublicInviteController {
    constructor(inviteSvc, usersSvc) {
        this.inviteSvc = inviteSvc;
        this.usersSvc = usersSvc;
    }
    async onboard(inviteId, body) {
        const invite = await this.inviteSvc.getInviteById(inviteId);
        if (!invite)
            throw new Error('Invite not found');
        if (!invite.userId) {
            return this.usersSvc.registerFromInvite(inviteId, {
                token: body.token,
                password: body.password,
                transactionPin: body.transactionPin,
                phone: body.phone,
                bvn: body.bvn,
                bvnValidationToken: body.bvnValidationToken,
                firstName: body.firstName,
                lastName: body.lastName,
                dob: body.dob,
                address: body.address,
                utilityBillUrl: body.utilityBillUrl,
            });
        }
        return this.usersSvc.completeInviteOnboarding(invite.userId, {
            inviteId,
            password: body.password,
            transactionPin: body.transactionPin,
            bvn: body.bvn,
            bvnValidationToken: body.bvnValidationToken,
            phone: body.phone,
            firstName: body.firstName,
            lastName: body.lastName,
            dob: body.dob,
            address: body.address,
            utilityBillUrl: body.utilityBillUrl,
        });
    }
};
exports.PublicInviteController = PublicInviteController;
__decorate([
    (0, common_1.Post)(':id/onboard'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Complete onboarding for an invited user (no auth)' }),
    (0, swagger_1.ApiBody)({ type: onboard_invite_dto_1.OnboardInviteDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Onboarding completed', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, onboard_invite_dto_1.OnboardInviteDto]),
    __metadata("design:returntype", Promise)
], PublicInviteController.prototype, "onboard", null);
exports.PublicInviteController = PublicInviteController = __decorate([
    (0, swagger_1.ApiTags)('Invites'),
    (0, common_1.Controller)('invites'),
    __metadata("design:paramtypes", [group_invite_service_1.GroupInviteService, users_service_1.UsersService])
], PublicInviteController);
//# sourceMappingURL=group-invite.controller.js.map