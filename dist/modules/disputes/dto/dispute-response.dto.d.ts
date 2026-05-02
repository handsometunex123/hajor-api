export declare class DisputeResponseDto {
    id: string;
    userId: string;
    type: string;
    description?: string;
    evidenceUrl?: string;
    status: string;
    adminNotes?: string;
    resolvedBy?: string;
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
