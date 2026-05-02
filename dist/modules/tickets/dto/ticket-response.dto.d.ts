export declare class TicketResponseDto {
    id: string;
    type: string;
    groupId: string;
    userId: string;
    status: string;
    reason?: string;
    contributorId?: string;
    newUserId?: string;
    adminNotes?: string;
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
