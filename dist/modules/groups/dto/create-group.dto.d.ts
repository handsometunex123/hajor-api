import { Frequency } from '../../../common/enums';
export declare class CreateGroupDto {
    name: string;
    description?: string;
    maxSlots: number;
    contributionAmount: number;
    frequency: Frequency;
    serviceCharge?: number;
    lateFee?: number;
    gracePeriodDays?: number;
    adminIndemnityAccepted: boolean;
}
