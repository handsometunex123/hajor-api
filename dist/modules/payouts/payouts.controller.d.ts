import { PayoutsService } from './payouts.service';
import { ExecutePayoutDto } from './dto/execute-payout.dto';
import { QueueService } from '../../infrastructure/queue/queue.service';
export declare class PayoutsController {
    private readonly payouts;
    private readonly queue;
    constructor(payouts: PayoutsService, queue: QueueService);
    execute(body: ExecutePayoutDto): Promise<{
        ok: boolean;
    }>;
    retry(body: ExecutePayoutDto): Promise<{
        ok: boolean;
        message: string;
    }>;
    triggerReconciliation(): Promise<{
        ok: boolean;
        message: string;
    }>;
}
