export declare class UpdateTicketStatusDto {
    status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
    adminNotes?: string;
}
