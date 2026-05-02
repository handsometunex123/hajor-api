export declare function buildDisplayId(firstName: string | null | undefined, lastName: string | null | undefined, slotNumber: number): string;
export declare function createContributorWithDisplayId(tx: {
    groupContributor: {
        create: (args: any) => Promise<any>;
    };
}, data: {
    groupId: string;
    userId: string;
    firstName: string | null | undefined;
    lastName: string | null | undefined;
    slotNumber: number;
}, extra?: Record<string, any>): Promise<any>;
