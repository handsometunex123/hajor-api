import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash, randomInt } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { QueueService } from '../../infrastructure/queue/queue.service';

@Injectable()
export class AuthService {
  private readonly refreshTtlDays: number;
  private readonly accessTokenTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly queue: QueueService,
  ) {
    this.refreshTtlDays = parseInt(this.config.get<string>('REFRESH_TOKEN_DAYS', '30'), 10);
    this.accessTokenTtlSeconds = parseInt(this.config.get<string>('ACCESS_TOKEN_TTL_SECONDS', (15 * 60).toString()), 10);
  }

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) return null;
    const ok = await bcrypt.compare(pass, user.password);
    if (!ok) return null;
    // omit password
    // @ts-ignore
    delete user.password;
    return user;
  }

  private signAccessToken(user: any) {
    // Role is stored directly on the user DB record (USER | PROXY | SUPER_ADMIN)
    const role = user.role || 'USER';
    const payload = { sub: user.id, email: user.email, role };
    return this.jwt.sign(payload, { expiresIn: `${this.accessTokenTtlSeconds}s` });
  }

  private genRefreshToken() {
    return randomBytes(64).toString('hex');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  // authenticate and issue tokens
  async authenticate(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const accessToken = this.signAccessToken(user);

    const refreshToken = this.genRefreshToken();
    const refreshHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: refreshHash, expiresAt } });

    // cache token hash status in redis for quick revocation checks
    try {
      const seconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
      await this.redis.set(`rt:${refreshHash}`, 'active', seconds);
    } catch (err) {
      // ignore cache errors
    }

    return { accessToken, refreshToken, refreshTokenExpiresAt: expiresAt, mustChangePassword: (user as any).mustChangePassword ?? false };
  }

  // Used by proxy users to change their temp password on first login.
  // Clears the mustChangePassword flag once done.
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed, mustChangePassword: false } as any });

    return { success: true };
  }

  // rotate refresh token: validate presented token, create new, revoke old
  async rotateRefreshToken(presented: string, req?: Request) {
    const hash = this.hashToken(presented);
    // fast-path using redis cache
    try {
      const status = await this.redis.get(`rt:${hash}`);
      if (status === 'revoked') {
        // revoke all tokens for this user if we can discover owner, fallback below
        const rtDb = await this.prisma.refreshToken.findFirst({ where: { tokenHash: hash } });
        if (rtDb) await this.prisma.refreshToken.updateMany({ where: { userId: rtDb.userId }, data: { revoked: true } });
        throw new UnauthorizedException('Refresh token revoked');
      }
    } catch (err) {
      // ignore cache errors and fallback to DB below
    }

    const rt = await this.prisma.refreshToken.findFirst({ where: { tokenHash: hash } });
    if (!rt) {
      // token reuse or invalid
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (rt.revoked) {
      // reuse detected
      await this.prisma.refreshToken.updateMany({ where: { userId: rt.userId }, data: { revoked: true } });
      // update cache
      try {
        await this.redis.set(`rt:${hash}`, 'revoked', 60);
      } catch (_) {}
      throw new UnauthorizedException('Refresh token revoked');
    }
    if (rt.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // create replacement
    const newToken = this.genRefreshToken();
    const newHash = this.hashToken(newToken);
    const expiresAt = new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);

    // use transaction to mark replaced and insert new
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({ where: { id: rt.id }, data: { revoked: true, replacedBy: undefined } });
      const created = await tx.refreshToken.create({ data: { userId: rt.userId, tokenHash: newHash, expiresAt } });
      await tx.refreshToken.update({ where: { id: rt.id }, data: { replacedBy: created.id } });
    });

    // update cache: mark old revoked, set new active
    try {
      const oldKey = `rt:${hash}`;
      const newKey = `rt:${newHash}`;
      await this.redis.set(oldKey, 'revoked', 60);
      const seconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
      await this.redis.set(newKey, 'active', seconds);
    } catch (err) {
      // ignore cache errors
    }

    const user = await this.prisma.user.findUnique({ where: { id: rt.userId } });
    if (!user) throw new BadRequestException('User not found');

    const accessToken = this.signAccessToken(user);
    return { accessToken, refreshToken: newToken, refreshTokenExpiresAt: expiresAt };
  }

  async revokeRefreshToken(presented: string) {
    const hash = this.hashToken(presented);
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: hash }, data: { revoked: true } });
    return { ok: true };
  }

  /**
   * Request a password reset — generates a 6-digit OTP stored in Redis (10 min TTL)
   * and sends it to the user via email notification.
   * Always returns success to prevent email enumeration.
   */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) return { ok: true }; // silent — prevent email enumeration

    const otp = randomInt(100000, 999999).toString();
    const key = `pwd_reset:${email.toLowerCase()}`;
    await this.redis.set(key, otp, 600); // 10 minutes

    try {
      await this.queue.addNotificationJob('send-notification', {
        userId: user.id,
        type: 'PASSWORD_RESET',
        payload: { otp, email },
      });
    } catch (err) {
      // ignore queue errors — OTP is still in Redis
    }

    return { ok: true };
  }

  /**
   * Confirm password reset using the OTP and set the new password.
   */
  async confirmPasswordReset(email: string, otp: string, newPassword: string) {
    const key = `pwd_reset:${email.toLowerCase()}`;
    const stored = await this.redis.get(key);
    const storedString = stored ? stored.toString() : null;
    if (!storedString || storedString !== otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) throw new BadRequestException('Invalid or expired OTP');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    // Revoke all existing refresh tokens for security
    await this.prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revoked: true } });

    // Clean up OTP
    try { await this.redis.del(key); } catch (_) {}

    // Audit log for password reset
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'password_reset',
        entityType: 'User',
        entityId: user.id,
        metadata: { email },
      },
    });

    return { ok: true };
  }

  /**
   * Send a 6-digit OTP to the user's email for email verification.
   */
  async requestEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.emailVerifiedAt) return { ok: true }; // already verified

    const otp = randomInt(100000, 999999).toString();
    const key = `email_verify:${userId}`;
    await this.redis.set(key, otp, 600); // 10 minutes

    try {
      await this.queue.addNotificationJob('send-notification', {
        userId,
        type: 'EMAIL_VERIFICATION',
        payload: { otp, email: user.email },
      });
    } catch (err) {
      // OTP is still in Redis
    }

    return { ok: true };
  }

  /**
   * Confirm email verification using the OTP.
   */
  async confirmEmailVerification(userId: string, otp: string) {
    const key = `email_verify:${userId}`;
    const stored = await this.redis.get(key);
    const storedString = stored ? stored.toString() : null;
    if (!storedString || storedString !== otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });

    try { await this.redis.del(key); } catch (_) {}

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'email_verified',
        entityType: 'User',
        entityId: userId,
        metadata: {},
      },
    });

    return { ok: true };
  }
}
