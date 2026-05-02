import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MyGroupSlotDto {
  @ApiProperty() id: string;
  @ApiProperty() displayId: string;
  @ApiPropertyOptional({ nullable: true }) payoutOrder: number | null;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional({ nullable: true }) termsAcceptedAt: Date | null;
  @ApiProperty() joinedAt: Date;
}

export class MyGroupItemDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty() status: string;
  @ApiProperty() frequency: string;
  @ApiProperty() contributionAmount: number;
  @ApiProperty() maxSlots: number;
  @ApiProperty({ description: 'True if the authenticated user is the group admin' }) isAdmin: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: [MyGroupSlotDto], description: 'The contributor slot(s) the user holds in this group (max 2)' }) slots: MyGroupSlotDto[];
}

export class MyGroupsPaginationDto {
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() pages: number;
}

export class MyGroupsResponseDto {
  @ApiProperty({ type: [MyGroupItemDto] }) items: MyGroupItemDto[];
  @ApiProperty({ type: MyGroupsPaginationDto }) pagination: MyGroupsPaginationDto;
}
