import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JsonObject } from '../../../common/types/json';

export class CreateTransactionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  walletId: string;

  @ApiProperty({ enum: ['CREDIT', 'DEBIT'] })
  @IsNotEmpty()
  @IsString()
  type: 'CREDIT' | 'DEBIT';

  @ApiProperty({ example: '1000' })
  @IsNotEmpty()
  @IsNumberString()
  amount: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  reference: string;

  @ApiPropertyOptional()
  @IsString()
  metadata?: JsonObject;
}
