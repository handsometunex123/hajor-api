declare class TicketUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}
declare class TicketGroup {
    id: string;
    name: string;
    adminId: string;
}
export declare class TicketDetailResponseDto {
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
    user: TicketUser;
    group: TicketGroup;
}
export {};
