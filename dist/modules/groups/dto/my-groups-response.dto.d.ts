export declare class MyGroupSlotDto {
    id: string;
    displayId: string;
    payoutOrder: number | null;
    isActive: boolean;
    termsAcceptedAt: Date | null;
    joinedAt: Date;
}
export declare class MyGroupItemDto {
    id: string;
    name: string;
    description: string | null;
    status: string;
    frequency: string;
    contributionAmount: number;
    maxSlots: number;
    isAdmin: boolean;
    createdAt: Date;
    slots: MyGroupSlotDto[];
}
export declare class MyGroupsPaginationDto {
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export declare class MyGroupsResponseDto {
    items: MyGroupItemDto[];
    pagination: MyGroupsPaginationDto;
}
