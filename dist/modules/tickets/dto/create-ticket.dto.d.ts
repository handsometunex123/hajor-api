export declare class CreateTicketDto {
    type: 'CONTRIBUTOR_REPLACEMENT' | 'LEAVE_GROUP';
    groupId: string;
    reason?: string;
    contributorId?: string;
    newUserId?: string;
}
