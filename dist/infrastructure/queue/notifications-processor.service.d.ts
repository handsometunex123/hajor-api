import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationsProcessorService {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService);
    private jlog;
    private jlogWarn;
    private jlogError;
    process(job: Job): Promise<any>;
}
