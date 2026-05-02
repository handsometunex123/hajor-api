import { IsNotEmpty, IsString, IsNumber, IsOptional, IsNumberString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWithdrawDto {
  @ApiProperty({ description: 'Amount to withdraw (in Naira)', example: 5000 })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  // Paystack recipient code (or saved recipient id)
  @ApiProperty({ description: 'Paystack recipient code', example: 'RCP_xxxxxxxxxxxxxxxx' })
  @IsNotEmpty()
  @IsString()
  recipient: string;

  @ApiPropertyOptional({ description: 'Optional note for the withdrawal', example: 'Rent payment' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ description: '6-digit transaction PIN', example: '123456' })
  @IsNotEmpty()
  @IsNumberString({}, { message: 'transactionPin must contain only digits' })
  @Length(6, 6, { message: 'transactionPin must be exactly 6 digits' })
  transactionPin: string;
}
