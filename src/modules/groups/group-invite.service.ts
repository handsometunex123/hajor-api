import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { createContributorWithDisplayId } from '../../common/utils/generate-display-id';

@Injectable()
export class GroupInviteService {
  private readonly saltRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly queueService: QueueService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    const rounds = parseInt(this.config.get<string>('BCRYPT_SALT_ROUNDS', '12'), 10);
    this.saltRounds = Number.isNaN(rounds) ? 12 : rounds;
  }

  // expose read-only lookup for invite by id
  async getInviteById(inviteId: string) {
    return this.prisma.invitation.findUnique({ where: { id: inviteId } });
  }

  // Admin creates an invite by contact info (non-app user). For email-based registration
  // we create an Invitation linked to the group and include the invited contact info
  // in `metadata`. The invited user will follow a registration link sent by email.
  async createContactInvite(adminId: string, groupId: string, contact: { firstName: string; lastName: string; email: string; phone?: string }) {
    const { firstName, lastName, email, phone } = contact;
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.frozenAt) throw new BadRequestException('Group is frozen \u2014 no mutations allowed');
      if (group.adminId !== adminId) throw new BadRequestException('Only admin can invite');
      if (group.status !== 'NOT_STARTED') throw new BadRequestException('Cannot invite after group has started');

      const total = await tx.groupContributor.count({ where: { groupId } });
      if (total >= group.maxSlots) throw new BadRequestException('Group is full');

      // Check for an existing pending invite for this email
      const existing = await tx.invitation.findFirst({ where: { groupId, metadata: { path: ['invitedEmail'], equals: email }, status: 'PENDING' } as any });
      if (existing) throw new BadRequestException('Invite already pending for this contact');

      // create invitation WITHOUT creating a placeholder user or wallet. The invited person
      // will register themselves via the emailed registration link.
      // create a one-time registration token and expiry
      const token = randomBytes(24).toString('hex');
      const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      const invite = await tx.invitation.create({
        data: {
          groupId,
          invitedById: adminId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          metadata: { invitedFirstName: firstName, invitedLastName: lastName, invitedEmail: email, invitedPhone: phone, registrationToken: token, registrationTokenExpiresAt: tokenExpiresAt },
        } as any,
      });

      // enqueue email-sending job (notifications queue) with registration link and token
      try {
        await this.queueService.addNotificationJob('send-invite-email', {
          inviteId: invite.id,
          email,
          firstName,
          lastName,
          token,
        });
      } catch (err) {
        // ignore queue failures
      }

      return invite;
    });
  }

  // OTP-based verification flow removed in favor of email registration links.
  async verifyContactInvite(_inviteId: string, _otp: string) {
    throw new BadRequestException('OTP-based invite verification is deprecated. Use email registration link flow.');
  }

  // Admin creates an invite for a user
  async createInvite(adminId: string, groupId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.frozenAt) throw new BadRequestException('Group is frozen \u2014 no mutations allowed');
      if (group.adminId !== adminId) throw new BadRequestException('Only admin can invite');
      if (group.status !== 'NOT_STARTED') throw new BadRequestException('Cannot invite after group has started');

      const total = await tx.groupContributor.count({ where: { groupId } });
      if (total >= group.maxSlots) throw new BadRequestException('Group is full');

      const existing = await tx.invitation.findFirst({ where: { groupId, userId, status: 'PENDING' } });
      if (existing) throw new BadRequestException('Invite already pending');

      const invitee = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!invitee) throw new BadRequestException('User not found — check the userId and try again');

      const alreadyContributor = await tx.groupContributor.findFirst({ where: { groupId, userId, deletedAt: null } });
      if (alreadyContributor) throw new BadRequestException('This user is already a contributor in the group');

      const invite = await tx.invitation.create({ data: { groupId, userId, invitedById: adminId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });

      // notify the invited user if a userId exists
      try {
        if (userId) {
          const grp = await tx.group.findUnique({ where: { id: groupId } });
          await this.notifications.sendNotification({ userId, type: 'GROUP_INVITE', title: `You've been invited to ${grp?.name}`, message: `You have an invite to join group ${grp?.name}`, payload: { groupId } });
        }
      } catch (err) {
        // ignore notification failures
      }

      return invite;
    });
  }

  // Admin: create if none exists, rotate token if one does (upsert).
  // Replaces the old createJoinLink + regenerateJoinLink pair.
  async upsertJoinLink(adminId: string, groupId: string) {
    const token = randomBytes(16).toString('hex');
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.adminId !== adminId) throw new BadRequestException('Only admin can manage the join link');

      // Wipe any existing reusable link so the new token is clean
      await tx.joinLink.deleteMany({ where: { groupId, reusable: true } });

      const link = await tx.joinLink.create({ data: { groupId, token, createdById: adminId, reusable: true } });
      return link;
    });
  }

  // Any group contributor or admin can fetch the current reusable join link for the group
  async getJoinLink(actorId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');

    // allow admin or any existing contributor to fetch the link
    const isAdmin = group.adminId === actorId;
    const isContributor = await this.prisma.groupContributor.findFirst({ where: { groupId, userId: actorId } });
    if (!isAdmin && !isContributor) throw new BadRequestException('Only group contributors can retrieve join link');

    const link = await this.prisma.joinLink.findFirst({ where: { groupId, reusable: true } });
    if (!link) throw new NotFoundException('Join link not found');
    return link;
  }

  // User: consume a join link token to create a pending Invitation (approval queue)
  async consumeJoinLink(userId: string, token: string) {
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.joinLink.findUnique({ where: { token } });
      if (!link) throw new NotFoundException('Join link not found');
      if (!link.isActive) throw new BadRequestException('Join link is paused');

      const group = await tx.group.findUnique({ where: { id: link.groupId } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.frozenAt) throw new BadRequestException('Group is frozen \u2014 no mutations allowed');
      if (group.status !== 'NOT_STARTED') throw new BadRequestException('Cannot join after group has started');

      // If a pending invite for this user->group already exists, return it
      const existing = await tx.invitation.findFirst({ where: { groupId: group.id, userId, status: 'PENDING' } });
      if (existing) return existing;

      const invite = await tx.invitation.create({ data: { groupId: group.id, userId, invitedById: link.createdById } });
      return invite;
    });
  }

  // Admin: pause the group's active join link(s)
  async pauseJoinLink(adminId: string, groupId: string) {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.adminId !== adminId) throw new BadRequestException('Only admin can pause join link');

      await tx.joinLink.updateMany({ where: { groupId, reusable: true }, data: { isActive: false, pausedAt: new Date(), pausedById: adminId } });
      return { success: true };
    });
  }

  // Admin: resume the group's join link(s)
  async resumeJoinLink(adminId: string, groupId: string) {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.adminId !== adminId) throw new BadRequestException('Only admin can resume join link');

      await tx.joinLink.updateMany({ where: { groupId, reusable: true }, data: { isActive: true, pausedAt: null, pausedById: null } });
      return { success: true };
    });
  }

  // Admin: revoke (delete) the group's active join link
  async revokeJoinLink(adminId: string, groupId: string) {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.adminId !== adminId) throw new BadRequestException('Only admin can revoke join link');

      await tx.joinLink.deleteMany({ where: { groupId, reusable: true } });
      return { success: true };
    });
  }

  // ─── Proxy user registration (Option 3) ───────────────────────────────────
  // Step 1: Admin initiates – OTP is sent to the user's phone via SMS.
  // The user reads the OTP back to the admin verbally, confirming consent.
  async proxyRegisterInit(adminId: string, groupId: string, data: { firstName: string; lastName: string; phone: string; email?: string }) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.frozenAt) throw new BadRequestException('Group is frozen \u2014 no mutations allowed');
    if (group.adminId !== adminId) throw new BadRequestException('Only the group admin can register proxy users');
    if (group.status !== 'NOT_STARTED') throw new BadRequestException('Cannot add contributors after group has started');

    const total = await this.prisma.groupContributor.count({ where: { groupId } });
    if (total >= group.maxSlots) throw new BadRequestException('Group is full');

    const phoneExists = await this.prisma.user.findFirst({ where: { phone: data.phone, deletedAt: null } });
    if (phoneExists) throw new BadRequestException('A user with this phone number already exists in the system');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `proxy_reg:${data.phone}`;

    await this.redis.set(redisKey, { otp, firstName: data.firstName, lastName: data.lastName, phone: data.phone, email: data.email || null, groupId, adminId }, 600);

    try {
      await this.queueService.addNotificationJob('send-sms', {
        phone: data.phone,
        message: `Hello ${data.firstName}, your Hajor group registration code is: ${otp}. Read this code to your group admin to complete joining. Expires in 10 minutes.`,
      });
    } catch (_) { /* ignore queue failure */ }

    return { message: 'OTP sent to user phone', phone: data.phone, expiresInSeconds: 600 };
  }

  // Step 2: Admin enters the OTP read back by the user.
  // On success, the user is created (role: PROXY, notificationChannel: SMS),
  // a wallet is provisioned, and the user is auto-added to the group.
  // An IndemnityForm is created so the admin carries accountability for the registration.
  async proxyRegisterConfirm(adminId: string, groupId: string, data: { phone: string; otp: string }) {
    const redisKey = `proxy_reg:${data.phone}`;
    const stored: any = await this.redis.get(redisKey);
    if (!stored) throw new BadRequestException('OTP expired or not found. Please initiate registration again.');
    if (stored.otp !== data.otp) throw new BadRequestException('Invalid OTP');
    if (stored.groupId !== groupId) throw new BadRequestException('OTP was not issued for this group');
    if (stored.adminId !== adminId) throw new BadRequestException('You did not initiate this registration');

    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.frozenAt) throw new BadRequestException('Group is frozen \u2014 no mutations allowed');
    if (group.status !== 'NOT_STARTED') throw new BadRequestException('Can only add contributors while group is NOT_STARTED');

    const totalContributors = await this.prisma.groupContributor.count({ where: { groupId } });
    if (totalContributors >= group.maxSlots) throw new BadRequestException('Group is already full');

    // Generate a 10-char temp password (no ambiguous characters)
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const tempPassword = Array.from({ length: 10 }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
    const hashed = await bcrypt.hash(tempPassword, this.saltRounds);

    // Email: use provided one, else generate a non-deliverable placeholder
    const email = stored.email || `proxy.${data.phone.replace(/\D/g, '')}@internal.hajor.app`;

    const { user, contributor } = await this.prisma.$transaction(async (tx) => {
      await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
      const phoneExists = await tx.user.findFirst({ where: { phone: data.phone, deletedAt: null } });
      if (phoneExists) throw new BadRequestException('A user with this phone already exists');

      const u = await tx.user.create({
        data: {
          firstName: stored.firstName,
          lastName: stored.lastName,
          email,
          phone: data.phone,
          password: hashed,
          role: UserRole.PROXY,
          notificationChannel: 'SMS',
          mustChangePassword: true,
        } as any,
      });

      await (tx.wallet as any).create({ _internal: true, data: { userId: u.id } });

      const userSlotCount = await tx.groupContributor.count({ where: { groupId: group.id, userId: u.id } });
      const totalSlots = await tx.groupContributor.count({ where: { groupId: group.id } });
      const slotNumber = userSlotCount + 1;
      const contributor = await createContributorWithDisplayId(tx, {
        groupId: group.id, userId: u.id, firstName: u.firstName, lastName: u.lastName, slotNumber,
      }, {
        joinMethod: 'invitation',
        payoutOrder: totalSlots + 1,
      });
      return { user: u, contributor };
    });

    // Clear OTP from Redis
    try { await this.redis.del(redisKey); } catch (_) { /* ignore */ }

    // Provision virtual account
    try {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId: user.id } });
      if (wallet) {
        await this.queueService.addNotificationJob('provision-virtual-account', {
          walletId: wallet.id, name: `${user.firstName} ${user.lastName}`, email,
        }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 } });
      }
    } catch (_) { /* ignore */ }

    // Send welcome SMS with temp password
    try {
      await this.queueService.addNotificationJob('send-sms', {
        phone: data.phone,
        message: `Welcome to Hajor! You have been added to group "${group.name}". Login email: ${email}. Temporary password: ${tempPassword}. Please change your password after your first login.`,
      });
    } catch (_) { /* ignore */ }

    return {
      message: 'Proxy user registered and added to group',
      userId: user.id,
      contributorId: contributor.id,
      loginEmail: email,
    };
  }

  // User: list my received invites
  async listMyInvites(userId: string, opts: { page?: number; limit?: number; status?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 200) : 50;
    const skip = (page - 1) * limit;

    const allowedSortFields = ['createdAt', 'status'];
    const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Record<string, unknown> = { userId };
    if (opts.status) where.status = opts.status;

    const [items, total] = await Promise.all([
      this.prisma.invitation.findMany({
        where,
        include: {
          group: { select: { id: true, name: true, contributionAmount: true, frequency: true, status: true } },
          invitedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.invitation.count({ where }),
    ]);

    return { items, pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } };
  }

  // Admin: list pending invites for a group
  async listPendingInvites(adminId: string, groupId: string, opts: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.adminId !== adminId) throw new BadRequestException('Only admin can list invites');

    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 200) : 50;
    const skip = (page - 1) * limit;

    const allowedSortFields = ['createdAt', 'status'];
    const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: any = { groupId, status: 'PENDING' };
    if (opts.search) {
      where.user = { OR: [
        { firstName: { contains: opts.search, mode: 'insensitive' } },
        { lastName: { contains: opts.search, mode: 'insensitive' } },
        { email: { contains: opts.search, mode: 'insensitive' } },
      ] };
    }

    const [invites, total] = await Promise.all([
      this.prisma.invitation.findMany({
        where,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }, invitedBy: { select: { id: true, firstName: true, lastName: true } } },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.invitation.count({ where }),
    ]);

    return { items: invites, pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } };
  }

  // User accepts invite
  async acceptInvite(userId: string, inviteId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.invitation.findUnique({ where: { id: inviteId } });
      if (!invite) throw new NotFoundException('Invite not found');
      if (invite.status !== 'PENDING') throw new BadRequestException('Invitation is no longer pending');
      if (invite.expiresAt && invite.expiresAt < new Date()) throw new BadRequestException('Invitation has expired');
      if (invite.userId !== userId) throw new BadRequestException('Not invited user');

      const group = await tx.group.findUnique({ where: { id: invite.groupId } });
      if (!group) throw new NotFoundException('Group not found');
      if (group.frozenAt) throw new BadRequestException('Group is frozen \u2014 no mutations allowed');
      if (group.status !== 'NOT_STARTED') throw new BadRequestException('Cannot accept invite after group start');

      const total = await tx.groupContributor.count({ where: { groupId: group.id } });
      if (total >= group.maxSlots) throw new BadRequestException('Group is full');

      const userSlots = await tx.groupContributor.count({ where: { groupId: group.id, userId } });
      if (userSlots >= 2) throw new BadRequestException('User already has maximum contributors in this group');

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const contributor = await createContributorWithDisplayId(tx, {
        groupId: group.id, userId, firstName: user.firstName, lastName: user.lastName, slotNumber: userSlots + 1,
      }, {
        joinMethod: 'invitation',
        payoutOrder: total + 1,
      });
      await tx.invitation.update({ where: { id: inviteId }, data: { status: 'APPROVED' } });

      // notify admin that invite was accepted
      try {
        const adminId = group.adminId;
        await this.notifications.sendNotification({ userId: adminId, type: 'INVITE_ACCEPTED', title: `Invite accepted`, message: `User accepted invitation for group ${group.name}`, payload: { groupId: group.id, userId } });
      } catch (err) {
        // ignore
      }

      return { contributor };
    });
  }

  // User rejects invite
  async rejectInvite(userId: string, inviteId: string) {
    const invite = await this.prisma.invitation.findUnique({ where: { id: inviteId } });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.status !== 'PENDING') throw new BadRequestException('Invitation is no longer pending');
    if (invite.userId !== userId) throw new BadRequestException('Not invited user');

    await this.prisma.invitation.update({ where: { id: inviteId }, data: { status: 'REJECTED' } });
    return { success: true };
  }
}
