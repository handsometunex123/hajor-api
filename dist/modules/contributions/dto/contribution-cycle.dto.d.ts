import { PaymentItemDto } from './payment-item.dto';
export declare class ContributionCycleDto {
    id: string;
    groupId: string;
    cycleNumber: number;
    contributionDate: string;
    payoutDate: string;
    status: string;
    payments?: PaymentItemDto[];
}
