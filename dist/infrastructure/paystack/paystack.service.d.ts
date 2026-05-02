export declare class PaystackService {
    private readonly logger;
    private readonly base;
    private readonly sk;
    private readonly webhookSecret;
    private headers;
    verifySignature(rawBody: string, signatureHeader: string | undefined): boolean;
    initiateCharge({ email, amount, reference, callback_url }: {
        email: string;
        amount: number | string;
        reference: string;
        callback_url?: string;
    }): Promise<any>;
    initiateTransfer({ source, amount, recipient, reference, reason }: {
        source?: string;
        amount: number | string;
        recipient: string;
        reference: string;
        reason?: string;
    }): Promise<any>;
    getTransaction(reference: string): Promise<any>;
}
