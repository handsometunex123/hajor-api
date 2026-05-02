import { GroupStatus, Frequency } from '../../../common/enums';
export declare class MyGroupsQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: GroupStatus;
    frequency?: Frequency;
    isAdmin?: boolean;
}
