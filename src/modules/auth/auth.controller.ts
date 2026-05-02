import { Body, Controller, Post, BadRequestException, Res, Req, HttpCode, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { PhoneVerificationService } from './phone-verification.service';
import { RequestPhoneVerificationDto } from './dto/request-phone-verification.dto';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { ApiTags, ApiBody, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { wrapResponse } from '../../common/dto/wrap-response';
import { AuthTokenResponseDto } from './dto/auth-token-response.dto';
import { OkResponseDto } from '../../common/dto/ok-response.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Response, Request } from 'express';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { ValidateBvnDto, BvnTokenResponseDto } from './dto/validate-bvn.dto';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly phoneVerification: PhoneVerificationService,
  ) {}
  @Post('request-phone-verification')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Request phone verification OTP', description: 'Sends a 6-digit OTP to the provided phone number via SMS. OTP expires after a configurable period.' })
  @ApiBody({ type: RequestPhoneVerificationDto })
  @ApiResponse({ status: 200, description: 'OTP sent', schema: { example: { message: 'OTP sent', expiresInSeconds: 300 } } })
  async requestPhoneVerification(@Body() dto: RequestPhoneVerificationDto) {
    return this.phoneVerification.sendOtp(dto.phone);
  }

  @Post('verify-phone-otp')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify phone OTP', description: 'Validates the OTP sent to the phone number. Returns ok: true if valid.' })
  @ApiBody({ type: VerifyPhoneOtpDto })
  @ApiResponse({ status: 200, description: 'OTP verified', schema: { example: { ok: true } } })
  async verifyPhoneOtp(@Body() dto: VerifyPhoneOtpDto) {
    return this.phoneVerification.verifyOtp(dto.phone, dto.otp);
  }

  @Post('login')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: wrapResponse(AuthTokenResponseDto) })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    try {
      // login throttling (per-IP and per-email)
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || (req.ip as string) || req.socket?.remoteAddress || 'unknown';
      const ttl = parseInt(this.config.get<string>('LOGIN_TTL_SECONDS', '300'), 10);
      const limit = parseInt(this.config.get<string>('LOGIN_MAX_PER_TTL', '10'), 10);

      const ipKey = `throttle:login:ip:${ip}`;
      const emailKey = `throttle:login:email:${dto.email}`;

      try {
        const client = this.redis.getClient();
        const ipHits = await client.incr(ipKey);
        if (ipHits === 1) await client.expire(ipKey, ttl);
        const emailHits = await client.incr(emailKey);
        if (emailHits === 1) await client.expire(emailKey, ttl);

        if (ipHits > limit || emailHits > limit) {
          throw new HttpException('Too many login attempts, try later', HttpStatus.TOO_MANY_REQUESTS);
        }
      } catch (err) {
        // ignore cache errors
      }

      const { accessToken, refreshToken, refreshTokenExpiresAt, mustChangePassword } = await this.auth.authenticate(dto.email, dto.password);

      // set HttpOnly secure cookie for refresh token
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/auth',
        expires: refreshTokenExpiresAt,
      });

      // on successful login, clear throttles for this user/ip
      try {
        const client = this.redis.getClient();
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || (req.ip as string) || req.socket?.remoteAddress || 'unknown';
        await client.del(`throttle:login:ip:${ip}`);
        await client.del(`throttle:login:email:${dto.email}`);
      } catch (err) {}

      return { access_token: accessToken, mustChangePassword };
    } catch (err) {
      throw new BadRequestException(err?.message || 'Authentication failed');
    }
  }

  @Post('validate-bvn')
  @Public()
  @ApiOperation({ summary: 'Validate BVN before registration or invite onboarding', description: 'Verifies BVN details against the provider and returns a short-lived token (5 min) to be passed to the registration or invite onboarding endpoint.' })
  @ApiBody({ type: ValidateBvnDto })
  @ApiResponse({ status: 200, description: 'BVN validated, token issued', type: BvnTokenResponseDto })
  async validateBvn(@Body() dto: ValidateBvnDto) {
    return this.users.validateBvnForSignup(dto);
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register new user (requires BVN validation token)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 200, description: 'Registration successful', type: wrapResponse(AuthTokenResponseDto) })
  async register(@Body() dto: any, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    try {
      const createdUser = await this.users.createUserWithBvnToken(dto);
      // issue tokens by authenticating freshly-created user
      const { accessToken, refreshToken, refreshTokenExpiresAt } = await this.auth.authenticate(dto.email, dto.password as string);
      // Fetch user with all fields to avoid Prisma type errors (or cast as any)
      const user = await this.users['prisma'].user.findUnique({
        where: { id: createdUser.id },
      }) as any;
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/auth',
        expires: refreshTokenExpiresAt,
      });
      // Send email verification OTP (non-blocking)
      this.auth.requestEmailVerification(user.id).catch(() => {});
      // Return all user audit fields in the response
      return {
        access_token: accessToken,
        userId: user.id,
        role: user.role,
        bvnVerified: user.bvnVerified,
        bvnVerifiedAt: user.bvnVerifiedAt,
        bvnVerificationRef: user.bvnVerificationRef,
        kycTier: user.kycTier,
      };
    } catch (err) {
      let message = 'Registration failed';
      if (err && typeof err === 'object') {
        if (err.message && typeof err.message === 'string') {
          message = err.message;
        } else {
          try {
            message = JSON.stringify(err);
          } catch {
            message = String(err);
          }
        }
      }
      throw new BadRequestException(message);
    }
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token and obtain new access token' })
  @ApiResponse({ status: 200, description: 'New access token', type: wrapResponse(AuthTokenResponseDto) })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token;
    if (!token) throw new BadRequestException('No refresh token');
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
    } catch (err) {
      throw new BadRequestException(err?.message || 'Refresh failed');
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Logout successful', type: wrapResponse(OkResponseDto) })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token;
    if (token) {
      await this.auth.revokeRefreshToken(token);
    }
    res.clearCookie('refresh_token', { path: '/auth' });
    return { ok: true };
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Request password reset OTP', description: 'Sends a 6-digit OTP to the user\'s email. OTP expires after 10 minutes.' })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiResponse({ status: 200, description: 'OTP sent if email exists', type: wrapResponse(OkResponseDto) })
  async forgotPassword(@Body() dto: RequestPasswordResetDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm password reset with OTP', description: 'Validates the OTP and sets the new password. All existing sessions are revoked.' })
  @ApiBody({ type: ConfirmPasswordResetDto })
  @ApiResponse({ status: 200, description: 'Password reset successful', type: wrapResponse(OkResponseDto) })
  async resetPassword(@Body() dto: ConfirmPasswordResetDto) {
    return this.auth.confirmPasswordReset(dto.email, dto.otp, dto.newPassword);
  }

  @Post('request-email-verification')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Request email verification OTP', description: 'Sends a 6-digit OTP to the authenticated user\'s email. OTP expires after 10 minutes.' })
  @ApiResponse({ status: 200, description: 'OTP sent', type: wrapResponse(OkResponseDto) })
  @ApiBearerAuth()
  async requestEmailVerification(@Req() req: RequestWithUser) {
    return this.auth.requestEmailVerification(req.user?.id);
  }

  @Post('verify-email')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify email with OTP', description: 'Confirms the user\'s email address using the 6-digit OTP.' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, description: 'Email verified', type: wrapResponse(OkResponseDto) })
  @ApiBearerAuth()
  async verifyEmail(@Req() req: RequestWithUser, @Body() dto: VerifyEmailDto) {
    return this.auth.confirmEmailVerification(req.user?.id, dto.otp);
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change password',
    description: 'Allows any authenticated user to change their password. Proxy users who logged in with a temporary password must call this endpoint before using the rest of the app. Clears the mustChangePassword flag on success.',
  })
  @ApiBody({ schema: { properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string', minLength: 8 } }, required: ['currentPassword', 'newPassword'] } })
  @ApiResponse({ status: 200, description: 'Password changed successfully', type: wrapResponse(OkResponseDto) })
  async changePassword(@Req() req: RequestWithUser, @Body() body: { currentPassword: string; newPassword: string }) {
    if (!body.currentPassword || !body.newPassword) throw new BadRequestException('currentPassword and newPassword are required');
    if (body.newPassword.length < 8) throw new BadRequestException('newPassword must be at least 8 characters');
    return this.auth.changePassword(req.user?.id, body.currentPassword, body.newPassword);
  }
}
