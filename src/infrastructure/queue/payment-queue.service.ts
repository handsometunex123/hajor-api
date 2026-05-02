import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from './queue.service';

@Injectable()
export class PaymentQueueService {
  private readonly logger = new Logger(PaymentQueueService.name);

  constructor(private readonly queue: QueueService) {}

  async scheduleAutoDebit(cycle: { id: string; contributionDate: string | Date }) {
    this.logger.log(`Scheduling auto-debit for cycle ${cycle.id}`);
    return this.queue.scheduleAutoDebit(cycle as any);
  }

  async enqueueRetryFailed(cycleId: string) {
    this.logger.log(`Enqueue retry-failed-payments for cycle ${cycleId}`);
    return this.queue.addPaymentJob('retry-failed-payments', { cycleId }, { jobId: `retry_failed_${cycleId}` });
  }
}
