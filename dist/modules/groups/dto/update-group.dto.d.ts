import { Frequency } from '../../../common/enums';
export declare class UpdateGroupDto {
    name?: string;
    description?: string;
    contributionAmount?: number;
    frequency?: Frequency;
    maxSlots?: number;
    serviceCharge?: number;
    lateFee?: number;
}
