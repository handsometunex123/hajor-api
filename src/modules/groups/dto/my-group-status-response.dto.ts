import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MyContributorDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Unique contributor display code' })
  displayId: string;

  @ApiPropertyOptional({ type: Number, nullable: true })
  payoutOrder: number | null;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional({ description: 'When terms were accepted, or null if pending', type: String, format: 'date-time', nullable: true })
  termsAcceptedAt: string | null;
}

export class MyGroupStatusResponseDto {
  @ApiProperty({ description: 'Whether the calling user is a contributor in this group' })
  isContributor: boolean;

  @ApiProperty({ description: 'Whether this group has terms that must be accepted' })
  termsRequired: boolean;

  @ApiProperty({ description: 'The user\'s contributor slot(s) in this group', type: [MyContributorDto] })
  contributors: MyContributorDto[];
}
