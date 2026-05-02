import { AuthService } from './auth.service';
import { PhoneVerificationService } from './phone-verification.service';
import { RequestPhoneVerificationDto } from './dto/request-phone-verification.dto';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Response, Request } from 'express';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { ValidateBvnDto } from './dto/validate-bvn.dto';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
export declare class AuthController {
    private readonly auth;
    private readonly redis;
    private readonly config;
    private readonly users;
    private readonly phoneVerification;
    constructor(auth: AuthService, redis: RedisService, config: ConfigService, users: UsersService, phoneVerification: PhoneVerificationService);
    requestPhoneVerification(dto: RequestPhoneVerificationDto): Promise<{
        message: string;
        expiresInSeconds: number;
    }>;
    verifyPhoneOtp(dto: VerifyPhoneOtpDto): Promise<{
        ok: boolean;
    }>;
    login(dto: LoginDto, res: Response, req: Request): Promise<{
        access_token: string;
        mustChangePassword: any;
    }>;
    validateBvn(dto: ValidateBvnDto): Promise<{
        token: string;
    }>;
    register(dto: any, res: Response, req: Request): Promise<{
        access_token: string;
        userId: any;
        role: any;
        bvnVerified: any;
        bvnVerifiedAt: any;
        bvnVerificationRef: any;
        kycTier: any;
    }>;
    refresh(req: Request, res: Response): Promise<{
        access_token: string;
    }>;
    logout(req: Request, res: Response): Promise<{
        ok: boolean;
    }>;
    forgotPassword(dto: RequestPasswordResetDto): Promise<{
        ok: boolean;
    }>;
    resetPassword(dto: ConfirmPasswordResetDto): Promise<{
        ok: boolean;
    }>;
    requestEmailVerification(req: RequestWithUser): Promise<{
        ok: boolean;
    }>;
    verifyEmail(req: RequestWithUser, dto: VerifyEmailDto): Promise<{
        ok: boolean;
    }>;
    changePassword(req: RequestWithUser, body: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{
        success: boolean;
    }>;
}
