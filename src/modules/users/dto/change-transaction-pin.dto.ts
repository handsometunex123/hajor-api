import { IsNotEmpty, IsNumberString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeTransactionPinDto {
  @ApiProperty({ description: 'Current 6-digit transaction PIN', example: '123456' })
  @IsNotEmpty()
  @IsNumberString({}, { message: 'currentPin must contain only digits' })
  @Length(6, 6, { message: 'currentPin must be exactly 6 digits' })
  currentPin: string;

  @ApiProperty({ description: 'New 6-digit transaction PIN', example: '654321' })
  @IsNotEmpty()
  @IsNumberString({}, { message: 'newPin must contain only digits' })
  @Length(6, 6, { message: 'newPin must be exactly 6 digits' })
  newPin: string;
}
