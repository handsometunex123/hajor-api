import { Injectable, Logger } from '@nestjs/common';
import { JsonObject } from '../../common/types/json';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Hash identifiers (e.g., BVN) using sha256 for privacy-preserving matching
  hashIdentifier(value: string) {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
  }

  // Check multiple accounts using an identifier hash (e.g., bvnHash)
  async checkMultipleAccounts(identifierType: string, value: string) {
    const h = this.hashIdentifier(value);
    const matches = await this.prisma.userIdentifier.findMany({ where: { type: identifierType, valueHash: h }, include: { user: true } });
    if (matches.length > 1) {
      this.logger.warn(`Multiple accounts detected for ${identifierType}`);
      // flag each involved user
      const flags = [] as any[];
      for (const m of matches) {
        const f = await this.prisma.fraudFlag.create({ data: { userId: m.userId, reason: `Multiple accounts for ${identifierType}`, severity: 'HIGH', metadata: { identifierType } } });
        flags.push(f);
      }
      return { flagged: true, flags };
    }
    return { flagged: false, count: matches.length };
  }

  // Check if a user has high default rate across contribution payments
  async checkDefaultRate(userId: string, lookbackCycles = 6, threshold = 3) {
    // Find recent cycles where this user had payments and their statuses
    const payments = await this.prisma.contributionPayment.findMany({ where: { groupContributor: { userId } }, orderBy: { createdAt: 'desc' }, take: 200 });
    const defaults = payments.filter((p) => p.status !== 'PAID');
    if (defaults.length >= threshold) {
      const flag = await this.prisma.fraudFlag.create({ data: { userId, reason: `Frequent defaults: ${defaults.length}`, severity: 'HIGH', metadata: { defaults: defaults.length } } });
      return { flagged: true, flag };
    }
    return { flagged: false, defaults: defaults.length };
  }

  async flagUser(userId: string, reason: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW', metadata?: JsonObject) {
    return this.prisma.fraudFlag.create({ data: { userId, reason, severity, metadata } });
  }

  async flagGroup(groupId: string, reason: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW', metadata?: JsonObject) {
    return this.prisma.fraudFlag.create({ data: { groupId, reason, severity, metadata } });
  }

  // Admin: list flags
  async listFlags(opts: { status?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 50;
    const where: any = {};
    if (opts.status) where.status = opts.status;

    // Safe sorting with allowlisted fields
    const allowedSortFields = ['createdAt', 'severity', 'status'];
    const sortBy = opts.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortOrder = opts.sortOrder === 'asc' ? 'asc' : 'desc';

    const [flags, total] = await Promise.all([
      this.prisma.fraudFlag.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
      this.prisma.fraudFlag.count({ where }),
    ]);

    return {
      items: flags,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async reviewFlag(flagId: string, reviewerId: string, status: 'ACTIVE' | 'REVIEWED' = 'REVIEWED', metadata?: JsonObject) {
    const updated = await this.prisma.fraudFlag.update({ where: { id: flagId }, data: { status, metadata: Object.assign({}, metadata || {}, { reviewedBy: reviewerId }) } });
    return updated;
  }
}

export default FraudService;
