import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { PaystackService } from '../../infrastructure/paystack/paystack.service';

@Injectable()
export class PaymentIntentService {
  constructor(
    private prisma: PrismaService,
    private transactions: TransactionsService,
    private paystack: PaystackService,
  ) {}

  async createIntent(cycleId: string, groupContributorId: string, email: string, callbackUrl?: string) {
    const payment = await this.prisma.contributionPayment.findFirst({
      where: { cycleId, groupContributorId },
      include: { cycle: true, groupContributor: true },
    });
    if (!payment) throw new NotFoundException('ContributionPayment not found');
    if (payment.status === 'PAID') throw new BadRequestException('Payment already paid');

    const amount = Number(payment.amount.toString());
    if (isNaN(amount) || amount <= 0) throw new BadRequestException('Invalid payment amount');

    const reference = `hajor:payment:${payment.id}`;

    const init = await this.paystack.initiateCharge({
      email,
      amount: amount,
      reference,
      callback_url: callbackUrl,
    });

    // create an internal PENDING transaction linked to this payment
    const wallet = await this.prisma.wallet.findUnique({ where: { userId: payment.groupContributor.userId } });
    if (!wallet) throw new NotFoundException('Contributor wallet not found');

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
}
