import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ContributorUserDto {
  @ApiProperty({ example: 'cuid-user-id' })
  id: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  phone?: string;
}

export class ContributorItemDto {
  @ApiProperty({ example: 'cuid-contributor-id' })
  id: string;

  @ApiProperty({ example: 'HAJOR-JOHDOE-1-K7FX2BNQ', description: 'Unique, human-readable contributor code' })
  displayId: string;

  @ApiProperty({ example: 'cuid-user-id' })
  userId: string;

  @ApiPropertyOptional({ example: 1, nullable: true, description: 'Position in the payout rotation' })
  payoutOrder?: number | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '2026-04-06T12:00:00.000Z', nullable: true, description: 'When the contributor accepted the group terms. Null if not yet accepted.' })
  termsAcceptedAt?: Date | null;

  @ApiProperty({ example: '2026-04-06T00:00:00.000Z' })
  joinedAt: Date;

  @ApiProperty({ type: ContributorUserDto })
  user: ContributorUserDto;

  @ApiProperty({ example: 'join_request', description: 'How the contributor joined the group' })
  joinMethod: string;
}

class PaginationDto {
  @ApiProperty({ example: 5 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  pages: number;
}

export class ContributorListResponseDto {
  @ApiProperty({ example: 'cuid-group-id' })
  groupId: string;

  @ApiProperty({ example: 10, description: 'Maximum contributor slots for the group' })
  slots: number;

  @ApiProperty({ type: [ContributorItemDto] })
  items: ContributorItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}
