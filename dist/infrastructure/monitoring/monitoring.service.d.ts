import { ConfigService } from '@nestjs/config';
export declare class MonitoringService {
    private readonly config;
    private readonly logger;
    private readonly webhook?;
    constructor(config: ConfigService);
    alert(event: string, details?: any): Promise<void>;
}
