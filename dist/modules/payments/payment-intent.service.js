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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentIntentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const transactions_service_1 = require("../transactions/transactions.service");
const paystack_service_1 = require("../../infrastructure/paystack/paystack.service");
let PaymentIntentService = class PaymentIntentService {
    constructor(prisma, transactions, paystack) {
        this.prisma = prisma;
        this.transactions = transactions;
        this.paystack = paystack;
    }
    async createIntent(cycleId, groupContributorId, email, callbackUrl) {
        const payment = await this.prisma.contributionPayment.findFirst({
            where: { cycleId, groupContributorId },
            include: { cycle: true, groupContributor: true },
        });
        if (!payment)
            throw new common_1.NotFoundException('ContributionPayment not found');
        if (payment.status === 'PAID')
            throw new common_1.BadRequestException('Payment already paid');
        const amount = Number(payment.amount.toString());
        if (isNaN(amount) || amount <= 0)
            throw new common_1.BadRequestException('Invalid payment amount');
        const reference = `hajor:payment:${payment.id}`;
        const init = await this.paystack.initiateCharge({
            email,
            amount: amount,
            reference,
            callback_url: callbackUrl,
        });
        const wallet = await this.prisma.wallet.findUnique({ where: { userId: payment.groupContributor.userId } });
        if (!wallet)
            throw new common_1.NotFoundException('Contributor wallet not found');
        const tx = await this.transactions.createTransaction({
            reference: `provider:paystack:charge:${init.data.reference}|payment:${payment.id}`,
            walletId: wallet.id,
            type: 'DEBIT',
            amount: payment.amount.toString(),
            status: 'PENDING',
            metadata: { provider: 'paystack', providerReference: init.data.reference, paymentId: payment.id },
        });
        return { authorization_url: init.data.authorization_url, provider_reference: init.data.reference, transaction: tx };
    }
};
exports.PaymentIntentService = PaymentIntentService;
exports.PaymentIntentService = PaymentIntentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        transactions_service_1.TransactionsService,
        paystack_service_1.PaystackService])
], PaymentIntentService);
//# sourceMappingURL=payment-intent.service.js.map