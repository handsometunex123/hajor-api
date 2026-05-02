import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly base = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
  private readonly sk = process.env.PAYSTACK_SECRET_KEY || '';
  private readonly webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET || '';

  private headers() {
    return { Authorization: `Bearer ${this.sk}`, 'Content-Type': 'application/json' };
  }

  verifySignature(rawBody: string, signatureHeader: string | undefined) {
    if (!this.webhookSecret) {
      this.logger.warn('PAYSTACK_WEBHOOK_SECRET not configured — webhook signature cannot be verified; request will be rejected');
      return false;
    }
    if (!signatureHeader) return false;
    try {
      const computed = crypto.createHmac('sha512', this.webhookSecret).update(rawBody).digest('hex');
      return computed === signatureHeader;
    } catch (err) {
      this.logger.warn('Error verifying paystack signature', err?.message || err);
      return false;
    }
  }

  async initiateCharge({ email, amount, reference, callback_url }: { email: string; amount: number | string; reference: string; callback_url?: string }) {
    const url = `${this.base}/transaction/initialize`;
    const data = { email, amount: typeof amount === 'number' ? Math.round(amount * 100) : amount, reference, callback_url } as any;
    const res = await axios.post(url, data, { headers: this.headers() });
    return res.data;
  }

  async initiateTransfer({ source = 'balance', amount, recipient, reference, reason }: { source?: string; amount: number | string; recipient: string; reference: string; reason?: string }) {
    const url = `${this.base}/transfer`;
    const data = { source, amount: typeof amount === 'number' ? Math.round(amount * 100) : amount, recipient, reference, reason } as any;
    const res = await axios.post(url, data, { headers: this.headers() });
    return res.data;
  }

  async getTransaction(reference: string) {
    const url = `${this.base}/transaction/verify/${reference}`;
    const res = await axios.get(url, { headers: this.headers() });
    return res.data;
  }
}
