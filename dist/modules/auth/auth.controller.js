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
var _a, _b, _c, _d, _e, _f, _g, _h;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const jwt_guard_1 = require("./jwt.guard");
const phone_verification_service_1 = require("./phone-verification.service");
const request_phone_verification_dto_1 = require("./dto/request-phone-verification.dto");
const verify_phone_otp_dto_1 = require("./dto/verify-phone-otp.dto");
const login_dto_1 = require("./dto/login.dto");
const create_user_dto_1 = require("../users/dto/create-user.dto");
const users_service_1 = require("../users/users.service");
const swagger_1 = require("@nestjs/swagger");
const wrap_response_1 = require("../../common/dto/wrap-response");
const auth_token_response_dto_1 = require("./dto/auth-token-response.dto");
const ok_response_dto_1 = require("../../common/dto/ok-response.dto");
const request_password_reset_dto_1 = require("./dto/request-password-reset.dto");
const confirm_password_reset_dto_1 = require("./dto/confirm-password-reset.dto");
const verify_email_dto_1 = require("./dto/verify-email.dto");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const express_1 = require("express");
const redis_service_1 = require("../../infrastructure/redis/redis.service");
const config_1 = require("@nestjs/config");
const validate_bvn_dto_1 = require("./dto/validate-bvn.dto");
let AuthController = class AuthController {
    constructor(auth, redis, config, users, phoneVerification) {
        this.auth = auth;
        this.redis = redis;
        this.config = config;
        this.users = users;
        this.phoneVerification = phoneVerification;
    }
    async requestPhoneVerification(dto) {
        return this.phoneVerification.sendOtp(dto.phone);
    }
    async verifyPhoneOtp(dto) {
        return this.phoneVerification.verifyOtp(dto.phone, dto.otp);
    }
    async login(dto, res, req) {
        var _a, _b, _c, _d;
        try {
            const ip = ((_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0].trim()) || req.ip || ((_b = req.socket) === null || _b === void 0 ? void 0 : _b.remoteAddress) || 'unknown';
            const ttl = parseInt(this.config.get('LOGIN_TTL_SECONDS', '300'), 10);
            const limit = parseInt(this.config.get('LOGIN_MAX_PER_TTL', '10'), 10);
            const ipKey = `throttle:login:ip:${ip}`;
            const emailKey = `throttle:login:email:${dto.email}`;
            try {
                const client = this.redis.getClient();
                const ipHits = await client.incr(ipKey);
                if (ipHits === 1)
                    await client.expire(ipKey, ttl);
                const emailHits = await client.incr(emailKey);
                if (emailHits === 1)
                    await client.expire(emailKey, ttl);
                if (ipHits > limit || emailHits > limit) {
                    throw new common_1.HttpException('Too many login attempts, try later', common_1.HttpStatus.TOO_MANY_REQUESTS);
                }
            }
            catch (err) {
            }
            const { accessToken, refreshToken, refreshTokenExpiresAt, mustChangePassword } = await this.auth.authenticate(dto.email, dto.password);
            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/auth',
                expires: refreshTokenExpiresAt,
            });
            try {
                const client = this.redis.getClient();
                const ip = ((_c = req.headers['x-forwarded-for']) === null || _c === void 0 ? void 0 : _c.split(',')[0].trim()) || req.ip || ((_d = req.socket) === null || _d === void 0 ? void 0 : _d.remoteAddress) || 'unknown';
                await client.del(`throttle:login:ip:${ip}`);
                await client.del(`throttle:login:email:${dto.email}`);
            }
            catch (err) { }
            return { access_token: accessToken, mustChangePassword };
        }
        catch (err) {
            throw new common_1.BadRequestException((err === null || err === void 0 ? void 0 : err.message) || 'Authentication failed');
        }
    }
    async validateBvn(dto) {
        return this.users.validateBvnForSignup(dto);
    }
    async register(dto, res, req) {
        try {
            const createdUser = await this.users.createUserWithBvnToken(dto);
            const { accessToken, refreshToken, refreshTokenExpiresAt } = await this.auth.authenticate(dto.email, dto.password);
            const user = await this.users['prisma'].user.findUnique({
                where: { id: createdUser.id },
            });
            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/auth',
                expires: refreshTokenExpiresAt,
            });
            this.auth.requestEmailVerification(user.id).catch(() => { });
            return {
                access_token: accessToken,
                userId: user.id,
                role: user.role,
                bvnVerified: user.bvnVerified,
                bvnVerifiedAt: user.bvnVerifiedAt,
                bvnVerificationRef: user.bvnVerificationRef,
                kycTier: user.kycTier,
            };
        }
        catch (err) {
            let message = 'Registration failed';
            if (err && typeof err === 'object') {
                if (err.message && typeof err.message === 'string') {
                    message = err.message;
                }
                else {
                    try {
                        message = JSON.stringify(err);
                    }
                    catch (_a) {
                        message = String(err);
                    }
                }
            }
            throw new common_1.BadRequestException(message);
        }
    }
    async refresh(req, res) {
        var _a;
        const token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.refresh_token;
        if (!token)
            throw new common_1.BadRequestException('No refresh token');
        try {
            const { accessToken, refreshToken, refreshTokenExpiresAt } = await this.auth.rotateRefreshToken(token, req);
            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/auth',
                expires: refreshTokenExpiresAt,
            });
            return { access_token: accessToken };
        }
        catch (err) {
            throw new common_1.BadRequestException((err === null || err === void 0 ? void 0 : err.message) || 'Refresh failed');
        }
    }
    async logout(req, res) {
        var _a;
        const token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.refresh_token;
        if (token) {
            await this.auth.revokeRefreshToken(token);
        }
        res.clearCookie('refresh_token', { path: '/auth' });
        return { ok: true };
    }
    async forgotPassword(dto) {
        return this.auth.requestPasswordReset(dto.email);
    }
    async resetPassword(dto) {
        return this.auth.confirmPasswordReset(dto.email, dto.otp, dto.newPassword);
    }
    async requestEmailVerification(req) {
        var _a;
        return this.auth.requestEmailVerification((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
    }
    async verifyEmail(req, dto) {
        var _a;
        return this.auth.confirmEmailVerification((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, dto.otp);
    }
    async changePassword(req, body) {
        var _a;
        if (!body.currentPassword || !body.newPassword)
            throw new common_1.BadRequestException('currentPassword and newPassword are required');
        if (body.newPassword.length < 8)
            throw new common_1.BadRequestException('newPassword must be at least 8 characters');
        return this.auth.changePassword((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, body.currentPassword, body.newPassword);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('request-phone-verification'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Request phone verification OTP', description: 'Sends a 6-digit OTP to the provided phone number via SMS. OTP expires after a configurable period.' }),
    (0, swagger_1.ApiBody)({ type: request_phone_verification_dto_1.RequestPhoneVerificationDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP sent', schema: { example: { message: 'OTP sent', expiresInSeconds: 300 } } }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_phone_verification_dto_1.RequestPhoneVerificationDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestPhoneVerification", null);
__decorate([
    (0, common_1.Post)('verify-phone-otp'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Verify phone OTP', description: 'Validates the OTP sent to the phone number. Returns ok: true if valid.' }),
    (0, swagger_1.ApiBody)({ type: verify_phone_otp_dto_1.VerifyPhoneOtpDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP verified', schema: { example: { ok: true } } }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_phone_otp_dto_1.VerifyPhoneOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyPhoneOtp", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'User login' }),
    (0, swagger_1.ApiBody)({ type: login_dto_1.LoginDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Login successful', type: (0, wrap_response_1.wrapResponse)(auth_token_response_dto_1.AuthTokenResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, typeof (_a = typeof express_1.Response !== "undefined" && express_1.Response) === "function" ? _a : Object, typeof (_b = typeof express_1.Request !== "undefined" && express_1.Request) === "function" ? _b : Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('validate-bvn'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Validate BVN before registration or invite onboarding', description: 'Verifies BVN details against the provider and returns a short-lived token (5 min) to be passed to the registration or invite onboarding endpoint.' }),
    (0, swagger_1.ApiBody)({ type: validate_bvn_dto_1.ValidateBvnDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'BVN validated, token issued', type: validate_bvn_dto_1.BvnTokenResponseDto }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [validate_bvn_dto_1.ValidateBvnDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "validateBvn", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Register new user (requires BVN validation token)' }),
    (0, swagger_1.ApiBody)({ type: create_user_dto_1.CreateUserDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Registration successful', type: (0, wrap_response_1.wrapResponse)(auth_token_response_dto_1.AuthTokenResponseDto) }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_c = typeof express_1.Response !== "undefined" && express_1.Response) === "function" ? _c : Object, typeof (_d = typeof express_1.Request !== "undefined" && express_1.Request) === "function" ? _d : Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Rotate refresh token and obtain new access token' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'New access token', type: (0, wrap_response_1.wrapResponse)(auth_token_response_dto_1.AuthTokenResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_e = typeof express_1.Request !== "undefined" && express_1.Request) === "function" ? _e : Object, typeof (_f = typeof express_1.Response !== "undefined" && express_1.Response) === "function" ? _f : Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Logout and revoke refresh token' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Logout successful', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_g = typeof express_1.Request !== "undefined" && express_1.Request) === "function" ? _g : Object, typeof (_h = typeof express_1.Response !== "undefined" && express_1.Response) === "function" ? _h : Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Request password reset OTP', description: 'Sends a 6-digit OTP to the user\'s email. OTP expires after 10 minutes.' }),
    (0, swagger_1.ApiBody)({ type: request_password_reset_dto_1.RequestPasswordResetDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP sent if email exists', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_password_reset_dto_1.RequestPasswordResetDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm password reset with OTP', description: 'Validates the OTP and sets the new password. All existing sessions are revoked.' }),
    (0, swagger_1.ApiBody)({ type: confirm_password_reset_dto_1.ConfirmPasswordResetDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Password reset successful', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [confirm_password_reset_dto_1.ConfirmPasswordResetDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('request-email-verification'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Request email verification OTP', description: 'Sends a 6-digit OTP to the authenticated user\'s email. OTP expires after 10 minutes.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP sent', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    (0, swagger_1.ApiBearerAuth)(),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestEmailVerification", null);
__decorate([
    (0, common_1.Post)('verify-email'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Verify email with OTP', description: 'Confirms the user\'s email address using the 6-digit OTP.' }),
    (0, swagger_1.ApiBody)({ type: verify_email_dto_1.VerifyEmailDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Email verified', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    (0, swagger_1.ApiBearerAuth)(),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, verify_email_dto_1.VerifyEmailDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Change password',
        description: 'Allows any authenticated user to change their password. Proxy users who logged in with a temporary password must call this endpoint before using the rest of the app. Clears the mustChangePassword flag on success.',
    }),
    (0, swagger_1.ApiBody)({ schema: { properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string', minLength: 8 } }, required: ['currentPassword', 'newPassword'] } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Password changed successfully', type: (0, wrap_response_1.wrapResponse)(ok_response_dto_1.OkResponseDto) }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        redis_service_1.RedisService,
        config_1.ConfigService,
        users_service_1.UsersService,
        phone_verification_service_1.PhoneVerificationService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map