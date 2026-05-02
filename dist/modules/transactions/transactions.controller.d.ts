import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
export declare class TransactionsController {
    private readonly transactions;
    constructor(transactions: TransactionsService);
    create(dto: CreateTransactionDto): Promise<{
        id: any;
        reference: any;
        status: any;
    }>;
}
