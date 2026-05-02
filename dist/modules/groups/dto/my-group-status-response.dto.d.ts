declare class MyContributorDto {
    id: string;
    displayId: string;
    payoutOrder: number | null;
    isActive: boolean;
    termsAcceptedAt: string | null;
}
export declare class MyGroupStatusResponseDto {
    isContributor: boolean;
    termsRequired: boolean;
    contributors: MyContributorDto[];
}
export {};
