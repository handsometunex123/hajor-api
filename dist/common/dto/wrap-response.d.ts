export declare function wrapResponse(DataType: new (...args: any[]) => any): {
    new (): {
        statusCode: number;
        timestamp: string;
        path: string;
        requestId: string | null;
        data: InstanceType<typeof DataType>;
        code: string;
    };
};
export declare function wrapArrayResponse(DataType: new (...args: any[]) => any): {
    new (): {
        statusCode: number;
        timestamp: string;
        path: string;
        requestId: string | null;
        data: InstanceType<typeof DataType>[];
        code: string;
    };
};
