import { ConfigService } from '@nestjs/config';
export declare class KycService {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService);
    verifyBvn(bvn: string, payload?: Record<string, any>): Promise<{
        success: boolean;
        data: {
            verificationId: string;
            firstName: string | null;
            lastName: string | null;
            dateOfBirth: string | null;
        };
    }>;
}
