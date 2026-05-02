import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(private readonly prisma: PrismaService, private readonly queue: QueueService, private readonly transactions: TransactionsService) {}

  /**
   * Execute payouts for a cycle atomically.
   * For each recipient, create a CREDIT transaction to their wallet and a corresponding AUDIT log.
   */
  async executeCyclePayout(cycleId: string) {
    const cycle = await this.prisma.contributionCycle.findUnique({ where: { id: cycleId }, include: { payments: true, group: true } });
    if (!cycle) throw new BadRequestException('Cycle not found');

    // strict validation: cycle must be COMPLETED
    if (cycle.status !== 'COMPLETED') {
      throw new BadRequestException('Cycle is not completed');
    }

    const payments = await this.prisma.contributionPayment.findMany({ where: { cycleId }, include: { groupContributor: true } });
    if (!payments || payments.length === 0) throw new BadRequestException('No payments found for cycle');

    // Allow payout when all contributions are either PAID or DEFAULTED
    const paidPayments = payments.filter((p) => p.status === 'PAID');
    const nonSettled = payments.filter((p) => p.status !== 'PAID' && p.status !== 'DEFAULTED');
    if (nonSettled.length > 0) throw new BadRequestException('Cycle still has pending/failed contributions — complete or default them first');

    // compute payout recipient
    const recipientContributor = await this.prisma.groupContributor.findFirst({ where: { groupId: cycle.groupId, payoutOrder: cycle.cycleNumber } });
    if (!recipientContributor) {
      this.logger.warn('No recipient for payout order; aborting payout');
      return null;
    }

    const total = paidPayments.reduce((acc, p) => acc + Number(p.amount.toString()), 0);

    // deterministic reference for idempotency
    const reference = `payout:${cycleId}`;
    const existing = await this.transactions.getByReference(reference);
    if (existing) {
      this.logger.log(`Payout already exists for cycle ${cycleId} tx=${existing.id}`);
      return { skipped: true, txId: existing.id };
    }

    // Atomic payout using double-entry inside a transaction: debit group wallet, credit recipient
    const result = await this.prisma.$transaction(async (tx) => {
      await (tx as any).$executeRaw`SELECT set_config('hajor.allow_internal', 'true', true)`;
      const recipientWallet = await tx.wallet.findUnique({ where: { userId: recipientContributor.userId } });
      if (!recipientWallet) throw new BadRequestException('Recipient wallet not found');

      // ensure group wallet exists
      let groupWallet = await tx.wallet.findUnique({ where: { groupId: cycle.groupId } });
      if (!groupWallet) {
        groupWallet = await (tx.wallet as any).create({ _internal: true, data: { groupId: cycle.groupId } });
      }

      const de = await this.transactions.createDoubleEntry({ fromWalletId: groupWallet.id, toWalletId: recipientWallet.id, amount: total.toString(), reference, status: 'SUCCESS', metadata: { cycleId, recipientMemberId: recipientContributor.id } }, tx as any);

      const payoutTxId = de && (de.credit || de.existing) ? (de.credit || de.existing) : null;

      await tx.auditLog.create({
        data: {
          actorId: null,
          action: 'execute_payout',
          entityType: 'Payout',
          entityId: payoutTxId,
          metadata: { cycleId, groupId: cycle.groupId, recipientMemberId: recipientContributor.id, amount: total },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: null,
          action: 'payout_marked',
          entityType: 'ContributionCycle',
          entityId: cycleId,
          metadata: { reference, txId: payoutTxId, groupId: cycle.groupId },
        },
      });

      return { payoutTxId };
    });

    this.logger.log(`Executed payout for cycle ${cycleId} tx=${result.payoutTxId}`);

    try {
      const recipientUserId = recipientContributor.userId;
      if (recipientUserId) {
        await this.queue.addNotificationJob('send-notification', { userId: recipientUserId, type: 'PAYOUT_SUCCESS', payload: { cycleId, txId: result.payoutTxId } });
      }
    } catch (err) {
      this.logger.warn('Failed to enqueue payout notification', err?.message || err);
    }

    // Check if all cycles for this group are now COMPLETED → mark group COMPLETED
    try {
      await this.checkGroupCompletion(cycle.groupId);
    } catch (err) {
      this.logger.warn('Failed to check group completion', err?.message || err);
    }

    return result;
  }

  /**
   * If every cycle in the group is COMPLETED, mark the group COMPLETED and notify contributors.
   */
  async checkGroupCompletion(groupId: string) {
    const allCycles = await this.prisma.contributionCycle.findMany({ where: { groupId } });
    if (allCycles.length === 0) return;

    const allDone = allCycles.every((c) => c.status === 'COMPLETED');
    if (!allDone) return;

    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group || group.status === 'COMPLETED' || group.status === 'ARCHIVED') return;

    await this.prisma.group.update({ where: { id: groupId }, data: { status: 'COMPLETED' } });
    this.logger.log(`Group ${groupId} marked COMPLETED — all cycles done`);

    // Notify all contributors
    try {
      const contributors = await this.prisma.groupContributor.findMany({ where: { groupId } });
      for (const c of contributors) {
        await this.queue.addNotificationJob('send-notification', {
          userId: c.userId,
          type: 'GROUP_COMPLETED',
          payload: { groupId, groupName: group.name },
        }).catch(() => {});
      }
    } catch (err) {
      this.logger.warn('Failed to notify group completion', err?.message || err);
    }
  }
}
