/**
  * Validate BVN (basic format check or external provider) and set user's `bvnVerified`.
   * Accepts extra fields and uses authenticated user context.
   */
import { Injectable, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { GroupStatus, Frequency } from '../../common/enums';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { KycService } from './kyc.service';
import { FraudService } from '../fraud/fraud.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  private readonly saltRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly kyc: KycService,
    private readonly fraud: FraudService,
    private readonly queueService: QueueService,
  ) {
    const rounds = parseInt(this.config.get<string>('BCRYPT_SALT_ROUNDS', '12'), 10);
    this.saltRounds = Number.isNaN(rounds) ? 12 : rounds;
  }
  // fetch lightweight user profile (cached)
  async getProfile(userId: string) {
    const key = `user:profile:${userId}`;
    try {
      const cached = await this.redis.get(key);
      if (cached) return cached;
    } catch (err) {
      // ignore cache errors
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dob: true,
        address: true,
        trustScore: true,
        bvnVerified: true,
        createdAt: true,
        referralCode: true,
        notificationChannel: true,
        role: true,
        kycTier: true,
        bvnVerifiedAt: true,
        bvnVerificationRef: true,
        emailVerifiedAt: true,
        lastActiveAt: true,
      },
    });
    if (!user) return null;
    try {
      await this.redis.set(key, user, 60 * 5); // cache 5 minutes
    } catch (err) {
      // ignore cache errors
    }
    return user;
  }

  /**
   * Step 1: Validate BVN and issue a short-lived token if valid.
   * This should be called before user creation.
   */
  async validateBvnForSignup(payload: {
    bvn: string;
    firstName: string;
    lastName: string;
    dob: string;
    phone: string;
  }) {
    const result = await this.kyc.verifyBvn(payload.bvn, {
      firstName: payload.firstName,
      lastName: payload.lastName,
      dob: payload.dob,
      phone: payload.phone,
    });
    if (!result?.success) {
      console.error('BVN validation failed:', { bvn: payload.bvn, result, payloadKeys: Object.keys(payload) });
      throw new BadRequestException('BVN validation failed. Please verify your details and try again.');
    }
    // Optionally, check name/dob match here as in createUser
    const normalize = (s: string) => (s || '').trim().toLowerCase();
    if (
      normalize(result.data.firstName) !== normalize(payload.firstName) ||
      normalize(result.data.lastName) !== normalize(payload.lastName) ||
      (payload.dob && result.data.dateOfBirth && normalize(result.data.dateOfBirth) !== normalize(payload.dob))
    ) {
      console.warn('BVN data mismatch:', {
        provided: { firstName: payload.firstName, lastName: payload.lastName, dob: payload.dob },
        kycRecord: { firstName: result.data.firstName, lastName: result.data.lastName, dob: result.data.dateOfBirth }
      });
      throw new BadRequestException('Name or date of birth does not match BVN record');
    }
    // Generate a short-lived token and store in Redis
    const token = crypto.randomBytes(16).toString('hex');
    await this.redis.set(`bvn:signup:${token}`, JSON.stringify({
      bvn: payload.bvn,
      firstName: payload.firstName,
      lastName: payload.lastName,
      dob: payload.dob,
      phone: payload.phone,
      verificationId: result.data.verificationId,
    }), 300); // 5 minutes expiry
    console.log(`BVN validation successful for ${payload.firstName} ${payload.lastName}`);
    return { token };
  }

  /**
   * Step 2: Create user, requiring a valid BVN validation token.
   * The token must be obtained from validateBvnForSignup.
   */
  async createUserWithBvnToken(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    transactionPin: string;
    dob?: Date;
    address?: string;
    utilityBillUrl?: string;
    referralCode?: string;
    bvn: string;
    bvnValidationToken: string;
  }) {
    // Check token in Redis
    const tokenKey = `bvn:signup:${data.bvnValidationToken}`;
    const tokenDataRaw = await this.redis.get(tokenKey);
    console.log({ TAKES: tokenDataRaw, isString: typeof tokenDataRaw === 'string' });
    // Remove debug log
    if (!tokenDataRaw) {
      throw new BadRequestException('BVN validation token is missing or expired. Please validate your BVN again.');
    }
    let tokenData;
    try {
      tokenData = typeof tokenDataRaw === 'string' ? JSON.parse(tokenDataRaw) : tokenDataRaw;
    } catch (err) {
      throw new BadRequestException('BVN validation token is invalid or corrupted. Please validate your BVN again.');
    }
    // Ensure the BVN and personal details match the token
    if (
      tokenData.bvn !== data.bvn ||
      tokenData.firstName !== data.firstName ||
      tokenData.lastName !== data.lastName ||
      tokenData.dob !== (data.dob instanceof Date ? data.dob.toISOString().slice(0, 10) : data.dob) ||
      tokenData.phone !== data.phone
    ) {
      throw new BadRequestException('BVN validation token does not match provided details.');
    }
    // Remove token so it can't be reused
    await this.redis.del(tokenKey);
    // Proceed with user creation (skip BVN validation here)
    const hashed = await bcrypt.hash(data.password, this.saltRounds);
    const hashedPin = await bcrypt.hash(data.transactionPin, this.saltRounds);
    function generateReferralCode() {
      return Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    let uniqueReferralCode: string | null = null;
    for (let i = 0; i < 5; i++) {
      const code = generateReferralCode();
      const exists = await this.prisma.user.findFirst({ where: { referralCode: code } });
      if (!exists) {
        uniqueReferralCode = code;
        break;
      }
    }
    if (!uniqueReferralCode) {
      throw new Error('Failed to generate unique referral code');
    }
    let referredById: string | undefined = undefined;
    if (data.referralCode) {
      const referrer = await this.prisma.user.findFirst({ where: { referralCode: data.referralCode } });
      if (referrer) {
        referredById = referrer.id;
      }
    }
    const userData: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      password: hashed,
      transactionPin: hashedPin,
      dob: data.dob ? new Date(data.dob) : undefined,
      address: data.address,
      utilityBillUrl: data.utilityBillUrl,
      referralCode: uniqueReferralCode,
      referredById: referredById,
      bvnVerified: true,
      bvnVerifiedAt: new Date(),
      bvnVerificationRef: tokenData.verificationId,
      kycTier: 1,
    };
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
        const user = await tx.user.create({ data: userData });
        await (tx.wallet as any).create({ _internal: true, data: { userId: user.id } });
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'create_user',
            entityType: 'User',
            entityId: user.id,
            metadata: { email: user.email, bvnVerificationRef: tokenData.verificationId, bvnVerified: true },
          },
        });
        return user;
      });
      // enqueue provisioning of Paystack virtual account for the created user's wallet
      try {
        const wallet = await this.prisma.wallet.findUnique({ where: { userId: created.id } });
        if (wallet) {
          await this.queueService.addNotificationJob('provision-virtual-account', {
            walletId: wallet.id,
            name: `${created.firstName} ${created.lastName}`,
            email: created.email,
          }, { attempts: 10, backoff: { type: 'exponential', delay: 3000 }, removeOnFail: false });
        }
      } catch (err) {
        // ignore provisioning enqueue failures
      }
      return created;
    } catch (err: any) {
      if (err?.code === 'P2002' || err?.code === '23505') {
        const existing = await this.prisma.user.findFirst({ where: { email: data.email } });
        if (existing) return existing;
      }
      throw err;
    }
  }

  async listUsers(opts: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc'; role?: UserRole; includeUnverified?: boolean }, access: { excludeSuperAdmins?: boolean } = {}) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (opts.search) {
      where.OR = [
        { firstName: { contains: opts.search, mode: 'insensitive' } },
        { lastName: { contains: opts.search, mode: 'insensitive' } },
        { email: { contains: opts.search, mode: 'insensitive' } },
        { phone: { contains: opts.search } },
      ];
    }
    // Only return users with bvnVerified=true by default; pass includeUnverified=true to include all
    if (!opts.includeUnverified) {
      where.bvnVerified = true;
    }
    // Filter by role when explicitly requested
    if (opts.role) {
      where.role = opts.role;
    }
    // Group admins cannot see super admin users
    if (access.excludeSuperAdmins) {
      where.role = { not: 'SUPER_ADMIN' };
    }

    // Safe sorting with allowlisted fields
    const allowedSortFields = ['createdAt', 'firstName', 'lastName', 'email'];
    const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, bvnVerified: true, role: true, notificationChannel: true, createdAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async countAdminGroups(userId: string): Promise<number> {
    return this.prisma.group.count({ where: { adminId: userId } });
  }

  async completeInviteOnboarding(userId: string, data: {
    inviteId: string;
    password: string;
    transactionPin: string;
    bvn: string;
    bvnValidationToken: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    dob?: string;
    address?: string;
    utilityBillUrl?: string;
  }) {
    // Validate BVN token from Redis before opening the transaction
    const tokenKey = `bvn:signup:${data.bvnValidationToken}`;
    const tokenDataRaw = await this.redis.get(tokenKey);
    if (!tokenDataRaw) {
      throw new BadRequestException('BVN validation token is missing or expired. Please validate your BVN again.');
    }
    let bvnTokenData: any;
    try {
      bvnTokenData = typeof tokenDataRaw === 'string' ? JSON.parse(tokenDataRaw) : tokenDataRaw;
    } catch {
      throw new BadRequestException('BVN validation token is invalid or corrupted. Please validate your BVN again.');
    }

    // Fetch the user to resolve names for BVN cross-check
    const proxyUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!proxyUser) throw new BadRequestException('User not found');

    const resolvedFirstName = data.firstName || proxyUser.firstName;
    const resolvedLastName = data.lastName || proxyUser.lastName;
    const resolvedPhone = data.phone || proxyUser.phone;

    if (
      bvnTokenData.bvn !== data.bvn ||
      bvnTokenData.firstName !== resolvedFirstName ||
      bvnTokenData.lastName !== resolvedLastName ||
      bvnTokenData.dob !== data.dob ||
      bvnTokenData.phone !== resolvedPhone
    ) {
      throw new BadRequestException('BVN validation token does not match provided details.');
    }
    await this.redis.del(tokenKey);

    const result = await this.prisma.$transaction(async (tx) => {
      await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
      const invite = await tx.invitation.findUnique({ where: { id: data.inviteId } });
      if (!invite) throw new Error('Invite not found');
      if (invite.userId !== userId) throw new Error('Not the invited user');
      if (invite.status === 'REJECTED') throw new Error('Invite was rejected');

      const hashed = await bcrypt.hash(data.password, this.saltRounds);
      const hashedPin = await bcrypt.hash(data.transactionPin, this.saltRounds);

      const updated = await (tx.user as any).update({
        where: { id: userId },
        data: {
          password: hashed,
          transactionPin: hashedPin,
          mustChangePassword: false,
          phone: data.phone || undefined,
          firstName: data.firstName || undefined,
          lastName: data.lastName || undefined,
          dob: data.dob ? new Date(data.dob) : undefined,
          address: data.address || undefined,
          utilityBillUrl: data.utilityBillUrl || undefined,
          emailVerifiedAt: new Date(),
          bvnVerified: true,
          bvnVerifiedAt: new Date(),
          bvnVerificationRef: bvnTokenData.verificationId,
          kycTier: 1,
          // The admin who sent the invite is automatically the referrer
          referredById: invite.invitedById,
        },
      });

      // Ensure the user has a wallet (idempotent). Some flows create a placeholder wallet at invite time,
      // but if it was not created for any reason, create one now so ledger entries have a target.
      const existingWallet = await tx.wallet.findUnique({ where: { userId } });
      if (!existingWallet) {
        await (tx.wallet as any).create({ _internal: true, data: { userId } });
      }

      try {
        await tx.invitation.update({ where: { id: data.inviteId }, data: { metadata: { ...(invite as any).metadata, onboardedAt: new Date().toISOString() } } as any });
      } catch (err) {
        // ignore metadata update failures
      }

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'complete_onboard',
          entityType: 'Invitation',
          entityId: data.inviteId,
          metadata: { userId },
        },
      });

      try {
        await this.redis.del(`user:profile:${userId}`);
      } catch (err) {
        // ignore cache clear errors
      }

      return { success: true, user: updated };
    });

    // enqueue provisioning for the wallet in case it was just created
    try {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      if (wallet) {
        await this.queueService.addNotificationJob('provision-virtual-account', {
          walletId: wallet.id,
          name: `${result.user.firstName} ${result.user.lastName}`,
          email: result.user.email,
          }, { attempts: 10, backoff: { type: 'exponential', delay: 3000 }, removeOnFail: false });
      }
    } catch (err) {
      // ignore enqueue failures
    }

    return result;
  }

  // Register a new user from an invitation (email-based flow). This creates the User,
  // creates a Wallet, links the Invitation to the new user, leaves the Invitation in
  // PENDING state for admin approval, and writes an audit log.
  async registerFromInvite(inviteId: string, data: {
    token: string;
    password: string;
    transactionPin: string;
    phone: string;
    bvn: string;
    bvnValidationToken: string;
    firstName?: string;
    lastName?: string;
    dob?: string;
    address?: string;
    utilityBillUrl?: string;
  }) {
    // Validate BVN token from Redis before opening the transaction (same flow as createUserWithBvnToken)
    const tokenKey = `bvn:signup:${data.bvnValidationToken}`;
    const tokenDataRaw = await this.redis.get(tokenKey);
    if (!tokenDataRaw) {
      throw new BadRequestException('BVN validation token is missing or expired. Please validate your BVN again.');
    }
    let bvnTokenData: any;
    try {
      bvnTokenData = typeof tokenDataRaw === 'string' ? JSON.parse(tokenDataRaw) : tokenDataRaw;
    } catch {
      throw new BadRequestException('BVN validation token is invalid or corrupted. Please validate your BVN again.');
    }

    // Fetch invite to resolve firstName/lastName/dob/phone for cross-check
    const inviteForBvn = await this.prisma.invitation.findUnique({ where: { id: inviteId } });
    if (!inviteForBvn) throw new BadRequestException('Invite not found');
    const metaForBvn: any = (inviteForBvn as any).metadata || {};
    const resolvedFirstName = data.firstName || metaForBvn.invitedFirstName;
    const resolvedLastName = data.lastName || metaForBvn.invitedLastName;
    const resolvedPhone = data.phone || metaForBvn.invitedPhone;

    if (
      bvnTokenData.bvn !== data.bvn ||
      bvnTokenData.firstName !== resolvedFirstName ||
      bvnTokenData.lastName !== resolvedLastName ||
      bvnTokenData.dob !== data.dob ||
      bvnTokenData.phone !== resolvedPhone
    ) {
      throw new BadRequestException('BVN validation token does not match provided details.');
    }
    // Consume token so it cannot be reused
    await this.redis.del(tokenKey);

    const res = await this.prisma.$transaction(async (tx) => {
      await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
      const invite = await tx.invitation.findUnique({ where: { id: inviteId } });
      if (!invite) throw new Error('Invite not found');

      if (invite.userId) throw new Error('Invite already linked to a user');

      const meta: any = (invite as any).metadata || {};
      if (!meta.registrationToken || meta.registrationToken !== data.token) throw new Error('Invalid or missing registration token');
      if (meta.registrationTokenExpiresAt && new Date(meta.registrationTokenExpiresAt) < new Date()) throw new Error('Registration token expired');

      const hashed = await bcrypt.hash(data.password, this.saltRounds);
      const hashedPin = await bcrypt.hash(data.transactionPin, this.saltRounds);

      const email = meta.invitedEmail;
      const firstName = resolvedFirstName || 'First';
      const lastName = resolvedLastName || 'Last';
      const phone = resolvedPhone || '';

      // Generate a unique referral code for the new user
      function generateReferralCode() {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
      }
      let uniqueReferralCode: string | null = null;
      for (let i = 0; i < 5; i++) {
        const code = generateReferralCode();
        const exists = await tx.user.findFirst({ where: { referralCode: code } });
        if (!exists) { uniqueReferralCode = code; break; }
      }
      if (!uniqueReferralCode) throw new Error('Failed to generate unique referral code');

      // If a user with this email already exists, link the invitation to them
      // instead of creating a duplicate account.
      const existingUser = await tx.user.findFirst({ where: { email } });
      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        // Ensure they have a wallet
        const existingWallet = await tx.wallet.findUnique({ where: { userId } });
        if (!existingWallet) {
          await (tx.wallet as any).create({ _internal: true, data: { userId } });
        }
      } else {
        const user = await tx.user.create({
          data: {
            firstName, lastName, email: email || '', phone, password: hashed,
            transactionPin: hashedPin,
            address: data.address,
            dob: data.dob ? new Date(data.dob) : undefined,
            utilityBillUrl: data.utilityBillUrl,
            // Email is verified by the fact the user clicked the invite link from their inbox
            emailVerifiedAt: new Date(),
            // BVN verified through the pre-validation step above
            bvnVerified: true,
            bvnVerifiedAt: new Date(),
            bvnVerificationRef: bvnTokenData.verificationId,
            kycTier: 1,
            // The admin who sent the invite is automatically the referrer
            referredById: invite.invitedById,
            referralCode: uniqueReferralCode,
          },
        });
        userId = user.id;
        await (tx.wallet as any).create({ _internal: true, data: { userId } });
      }

      // link invitation to the user and clear the one-time token
      await tx.invitation.update({ where: { id: inviteId }, data: { userId, metadata: { ...meta, registeredAt: new Date().toISOString(), registrationToken: null, registrationTokenExpiresAt: null } } as any });

      await tx.auditLog.create({ data: { actorId: userId, action: 'register_from_invite', entityType: 'Invitation', entityId: inviteId, metadata: { inviteId, existingAccount: !!existingUser } } });

      const user = existingUser ?? await tx.user.findUnique({ where: { id: userId } });
      return { success: true, user };
    });

    // enqueue provisioning for the wallet created for this user
    try {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId: res.user.id } });
      if (wallet) {
        await this.queueService.addNotificationJob('provision-virtual-account', {
          walletId: wallet.id,
          name: `${res.user.firstName} ${res.user.lastName}`,
          email: res.user.email,
          }, { attempts: 10, backoff: { type: 'exponential', delay: 3000 }, removeOnFail: false });
      }
    } catch (err) {
      // ignore enqueue failures
    }

    // notify user that their account and KYC are complete
    try {
      await this.queueService.addNotificationJob('send-notification', {
        userId: res.user.id,
        type: 'REGISTRATION_COMPLETE',
        payload: { message: 'Your account has been created and identity verified successfully.' },
      });
    } catch (err) {
      // ignore notification enqueue failures
    }

    return res;
  }

  /**
   * Upgrade a PROXY user to a full USER.
   * Changes role, sets notificationChannel to EMAIL, clears cached profile.
   */
  async upgradeProxyToUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.role !== 'PROXY') throw new BadRequestException('User is not a PROXY');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'USER', notificationChannel: 'EMAIL' },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'upgrade_proxy_to_user',
        entityType: 'User',
        entityId: userId,
        metadata: { previousRole: 'PROXY' },
      },
    });

    try { await this.redis.del(`user:profile:${userId}`); } catch (_) {}

    return { ok: true, userId: updated.id, role: updated.role };
  }
  async validateBvnAndSet(userId: string, dto: { bvn: string; dob?: string; phone?: string; firstName?: string; lastName?: string }) {
    // Load user for context
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Use provided fields or fallback to user profile
    const payload = {
      firstName: dto.firstName || user.firstName,
      lastName: dto.lastName || user.lastName,
      phone: dto.phone || user.phone,
      dob: dto.dob || (user.dob ? user.dob.toISOString().slice(0, 10) : undefined),
    };

    // Call external KYC provider via KycService (falls back to local format check)
    const verificationResult = await this.kyc.verifyBvn(dto.bvn, payload);

    if (!verificationResult) {
      throw new BadRequestException('BVN verification failed: the provided BVN could not be verified against your profile');
    }

    await this.prisma.user.update({ where: { id: userId }, data: { bvnVerified: true, bvnVerifiedAt: new Date(), bvnVerificationRef: verificationResult.data.verificationId } });

    // Clear cached profile if present
    try {
      await this.redis.del(`user:profile:${userId}`);
    } catch (err) {
      // ignore cache errors
    }

    return { userId, bvnVerified: true };
  }

  async getMyGroups(userId: string, opts: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: GroupStatus;
    frequency?: Frequency;
    isAdmin?: boolean;
  } = {}) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 20;

    const groupWhere: any = {};
    if (opts.search) groupWhere.name = { contains: opts.search, mode: 'insensitive' };
    if (opts.status) groupWhere.status = opts.status;
    if (opts.frequency) groupWhere.frequency = opts.frequency;
    if (opts.isAdmin === true) groupWhere.adminId = userId;
    if (opts.isAdmin === false) groupWhere.adminId = { not: userId };

    const contributorSlots = await this.prisma.groupContributor.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(Object.keys(groupWhere).length > 0 ? { group: groupWhere } : {}),
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            frequency: true,
            contributionAmount: true,
            maxSlots: true,
            adminId: true,
            createdAt: true,
          },
        },
      },
    });

    // Deduplicate: merge multiple slots per group into one entry
    const groupMap = new Map<string, { group: any; isAdmin: boolean; slots: any[] }>();
    for (const m of contributorSlots) {
      if (!groupMap.has(m.groupId)) {
        groupMap.set(m.groupId, { group: m.group, isAdmin: m.group.adminId === userId, slots: [] });
      }
      groupMap.get(m.groupId).slots.push({
        id: m.id,
        displayId: m.displayId,
        payoutOrder: m.payoutOrder,
        isActive: m.isActive,
        termsAcceptedAt: m.termsAcceptedAt,
        joinedAt: m.joinedAt,
      });
    }

    let items = Array.from(groupMap.values()).map(({ group, isAdmin, slots }) => ({ ...group, isAdmin, slots }));

    // Sort
    const allowedSortFields = ['name', 'createdAt', 'contributionAmount'];
    const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortDir = opts.sortOrder === 'asc' ? 1 : -1;
    items.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal < bVal) return -sortDir;
      if (aVal > bVal) return sortDir;
      return 0;
    });

    // Paginate
    const total = items.length;
    const pages = Math.ceil(total / limit) || 1;
    items = items.slice((page - 1) * limit, page * limit);

    return { items, pagination: { total, page, limit, pages } };
  }

  async verifyTransactionPin(userId: string, pin: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { transactionPin: true } });
    if (!user?.transactionPin) return false;
    return bcrypt.compare(pin, user.transactionPin);
  }

  async changeTransactionPin(userId: string, currentPin: string, newPin: string): Promise<{ ok: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { transactionPin: true } });
    if (!user?.transactionPin) {
      throw new BadRequestException('No transaction PIN is set on this account');
    }
    const isMatch = await bcrypt.compare(currentPin, user.transactionPin);
    if (!isMatch) {
      throw new BadRequestException('Current PIN is incorrect');
    }
    const hashedPin = await bcrypt.hash(newPin, this.saltRounds);
    await this.prisma.user.update({ where: { id: userId }, data: { transactionPin: hashedPin } });
    return { ok: true };
  }

  async resetTransactionPin(userId: string, password: string, newPin: string): Promise<{ ok: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!user) throw new BadRequestException('User not found');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new BadRequestException('Incorrect password');
    }
    const hashedPin = await bcrypt.hash(newPin, this.saltRounds);
    await this.prisma.user.update({ where: { id: userId }, data: { transactionPin: hashedPin } });
    return { ok: true };
  }

  async getReferralStats(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    if (!user) throw new BadRequestException('User not found');

    const baseWhere = { referredById: userId, deletedAt: null };

    const [totalReferrals, onboardedReferrals] = await Promise.all([
      this.prisma.user.count({ where: baseWhere }),
      this.prisma.user.count({ where: { ...baseWhere, bvnVerified: true, kycTier: 1 } }),
    ]);

    return {
      referralCode: user.referralCode,
      totalReferrals,
      onboardedReferrals,
    };
  }
}
