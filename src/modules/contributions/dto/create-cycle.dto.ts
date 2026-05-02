import { IsInt, IsNotEmpty, IsString, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCycleDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  groupId: string;

  @ApiProperty({ minimum: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  cycleNumber: number;

  @ApiProperty({ format: 'date-time' })
  @IsNotEmpty()
  @IsDateString()
  contributionDate: string;

  @ApiProperty({ format: 'date-time' })
  @IsNotEmpty()
  @IsDateString()
  payoutDate: string;
}
