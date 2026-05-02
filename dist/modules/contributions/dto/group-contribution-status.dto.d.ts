import { ContributionCycleDto } from './contribution-cycle.dto';
import { ContributorLiteDto } from './contributor-lite.dto';
export declare class GroupContributionStatusDto {
    current?: ContributionCycleDto | null;
    paid: ContributorLiteDto[];
    unpaid: ContributorLiteDto[];
    defaulters: ContributorLiteDto[];
}
