import { IsNotEmpty, IsNumberString, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetTransactionPinDto {
  @ApiProperty({ description: 'Account password to confirm identity', example: 'StrongP@ssw0rd' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({ description: 'New 6-digit transaction PIN', example: '654321' })
  @IsNotEmpty()
  @IsNumberString({}, { message: 'newPin must contain only digits' })
  @Length(6, 6, { message: 'newPin must be exactly 6 digits' })
  newPin: string;
}
