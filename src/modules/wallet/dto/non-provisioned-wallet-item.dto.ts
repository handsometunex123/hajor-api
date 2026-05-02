import { ApiProperty } from '@nestjs/swagger';

export class NonProvisionedWalletItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false })
  userId?: string | null;

  @ApiProperty({ required: false })
  provisionStatus?: string | null;

  @ApiProperty({ required: false })
  attempts?: number;

  @ApiProperty({ required: false })
  provisionedAt?: string | null;

  @ApiProperty({ required: false })
  user?: Record<string, unknown> | null;
}
