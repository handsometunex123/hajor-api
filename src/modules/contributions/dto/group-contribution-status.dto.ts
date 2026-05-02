import { ApiProperty } from '@nestjs/swagger';
import { ContributionCycleDto } from './contribution-cycle.dto';
import { ContributorLiteDto } from './contributor-lite.dto';

export class GroupContributionStatusDto {
  @ApiProperty({ type: ContributionCycleDto, required: false })
  current?: ContributionCycleDto | null;

  @ApiProperty({ type: [ContributorLiteDto] })
  paid!: ContributorLiteDto[];

  @ApiProperty({ type: [ContributorLiteDto] })
  unpaid!: ContributorLiteDto[];

  @ApiProperty({ type: [ContributorLiteDto] })
  defaulters!: ContributorLiteDto[];
}
