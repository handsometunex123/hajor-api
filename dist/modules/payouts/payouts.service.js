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
var PayoutsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const queue_service_1 = require("../../infrastructure/queue/queue.service");
const transactions_service_1 = require("../transactions/transactions.service");
let PayoutsService = PayoutsService_1 = class PayoutsService {
    constructor(prisma, queue, transactions) {
        this.prisma = prisma;
        this.queue = queue;
        this.transactions = transactions;
        this.logger = new common_1.Logger(PayoutsService_1.name);
    }
    async executeCyclePayout(cycleId) {
        const cycle = await this.prisma.contributionCycle.findUnique({ where: { id: cycleId }, include: { payments: true, group: true } });
        if (!cycle)
            throw new common_1.BadRequestException('Cycle not found');
        if (cycle.status !== 'COMPLETED') {
            throw new common_1.BadRequestException('Cycle is not completed');
        }
        const payments = await this.prisma.contributionPayment.findMany({ where: { cycleId }, include: { groupContributor: true } });
        if (!payments || payments.length === 0)
            throw new common_1.BadRequestException('No payments found for cycle');
        const paidPayments = payments.filter((p) => p.status === 'PAID');
        const nonSettled = payments.filter((p) => p.status !== 'PAID' && p.status !== 'DEFAULTED');
        if (nonSettled.length > 0)
            throw new common_1.BadRequestException('Cycle still has pending/failed contributions — complete or default them first');
        const recipientContributor = await this.prisma.groupContributor.findFirst({ where: { groupId: cycle.groupId, payoutOrder: cycle.cycleNumber } });
        if (!recipientContributor) {
            this.logger.warn('No recipient for payout order; aborting payout');
            return null;
        }
        const total = paidPayments.reduce((acc, p) => acc + Number(p.amount.toString()), 0);
        const reference = `payout:${cycleId}`;
        const existing = await this.transactions.getByReference(reference);
        if (existing) {
            this.logger.log(`Payout already exists for cycle ${cycleId} tx=${existing.id}`);
            return { skipped: true, txId: existing.id };
        }
        const result = await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
            const recipientWallet = await tx.wallet.findUnique({ where: { userId: recipientContributor.userId } });
            if (!recipientWallet)
                throw new common_1.BadRequestException('Recipient wallet not found');
            let groupWallet = await tx.wallet.findUnique({ where: { groupId: cycle.groupId } });
            if (!groupWallet) {
                groupWallet = await tx.wallet.create({ _internal: true, data: { groupId: cycle.groupId } });
            }
            const de = await this.transactions.createDoubleEntry({ fromWalletId: groupWallet.id, toWalletId: recipientWallet.id, amount: total.toString(), reference, status: 'SUCCESS', metadata: { cycleId, recipientMemberId: recipientContributor.id } }, tx);
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
        }
        catch (err) {
            this.logger.warn('Failed to enqueue payout notification', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        try {
            await this.checkGroupCompletion(cycle.groupId);
        }
        catch (err) {
            this.logger.warn('Failed to check group completion', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        return result;
    }
    async checkGroupCompletion(groupId) {
        const allCycles = await this.prisma.contributionCycle.findMany({ where: { groupId } });
        if (allCycles.length === 0)
            return;
        const allDone = allCycles.every((c) => c.status === 'COMPLETED');
        if (!allDone)
            return;
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group || group.status === 'COMPLETED' || group.status === 'ARCHIVED')
            return;
        await this.prisma.group.update({ where: { id: groupId }, data: { status: 'COMPLETED' } });
        this.logger.log(`Group ${groupId} marked COMPLETED — all cycles done`);
        try {
            const contributors = await this.prisma.groupContributor.findMany({ where: { groupId } });
            for (const c of contributors) {
                await this.queue.addNotificationJob('send-notification', {
                    userId: c.userId,
                    type: 'GROUP_COMPLETED',
                    payload: { groupId, groupName: group.name },
                }).catch(() => { });
            }
        }
        catch (err) {
            this.logger.warn('Failed to notify group completion', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
    }
};
exports.PayoutsService = PayoutsService;
exports.PayoutsService = PayoutsService = PayoutsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, queue_service_1.QueueService, transactions_service_1.TransactionsService])
], PayoutsService);
//# sourceMappingURL=payouts.service.js.map