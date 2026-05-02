declare class ContributorUserDto {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
}
export declare class ContributorItemDto {
    id: string;
    displayId: string;
    userId: string;
    payoutOrder?: number | null;
    isActive: boolean;
    termsAcceptedAt?: Date | null;
    joinedAt: Date;
    user: ContributorUserDto;
    joinMethod: string;
}
declare class PaginationDto {
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export declare class ContributorListResponseDto {
    groupId: string;
    slots: number;
    items: ContributorItemDto[];
    pagination: PaginationDto;
}
export {};
