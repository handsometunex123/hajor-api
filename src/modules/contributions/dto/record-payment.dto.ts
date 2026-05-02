import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordPaymentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  cycleId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  groupContributorId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  reference: string;

  @ApiProperty({ example: '1000' })
  @IsNotEmpty()
  @IsNumberString()
  amount: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  payerWalletId: string;
}
