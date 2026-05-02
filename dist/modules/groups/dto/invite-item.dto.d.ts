declare class UserLiteDto {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
}
export declare class InviteItemDto {
    id: string;
    user?: UserLiteDto | null;
    invitedBy?: UserLiteDto | null;
    metadata?: Record<string, unknown> | null;
    status: string;
    createdAt: string;
}
export {};
