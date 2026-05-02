export declare class FlagDto {
    userId?: string;
    groupId?: string;
    reason: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH';
    metadata?: any;
}
