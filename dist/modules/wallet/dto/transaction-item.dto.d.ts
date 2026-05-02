export declare class TransactionItemDto {
    id: string;
    type: string;
    amount: string;
    reference?: string;
    status: string;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
}
