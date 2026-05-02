import { Frequency } from '../../../common/enums';
export declare class GroupSearchQueryDto {
    name?: string;
    frequency?: Frequency;
    status?: string;
    contributionAmount?: number;
    contributionAmountMin?: number;
    contributionAmountMax?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
