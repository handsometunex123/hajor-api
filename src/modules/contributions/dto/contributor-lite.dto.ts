import { ApiProperty } from '@nestjs/swagger';

export class ContributorLiteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false })
  userId?: string;

  @ApiProperty({ required: false })
  payoutOrder?: number;
}
