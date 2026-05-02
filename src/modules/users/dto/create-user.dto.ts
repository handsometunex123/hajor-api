import { IsEmail, IsNotEmpty, IsString, IsDateString, IsOptional, MinLength, Matches, IsNumberString, Length } from 'class-validator';
import { MinAge } from '../../..//common/validators/min-age.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'First name', example: 'John' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Email address', example: 'john.doe@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Nigerian phone number in international format',
    example: '+2347038939208',
    pattern: '^\\+234\\d{10}$',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+234\d{10}$/, { message: 'phone must be a Nigerian number in international format (e.g. +2347038939208)' })
  phone: string;

  @ApiPropertyOptional({ description: 'Bank Verification Number', example: '12345678901' })
  @IsString()
  bvn: string;

  @ApiProperty({ description: 'Date of birth (must be at least 16 years old)', example: '1995-06-15' })
  @IsNotEmpty()
  @IsDateString()
  @MinAge(16, { message: 'user must be at least 16 years old' })
  dob: Date;

  @ApiProperty({ description: 'User password', example: 'StrongP@ssw0rd', format: 'password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters long' })
  @Matches(/(?=.*[a-z])/, { message: 'password must contain at least one lowercase letter' })
  @Matches(/(?=.*[A-Z])/, { message: 'password must contain at least one uppercase letter' })
  @Matches(/(?=.*\d)/, { message: 'password must contain at least one number' })
  @Matches(/(?=.*[^A-Za-z0-9])/, { message: 'password must contain at least one special character' })
  password: string;

  @ApiProperty({ description: '6-digit numeric transaction PIN', example: '123456' })
  @IsNotEmpty()
  @IsNumberString({}, { message: 'transactionPin must contain only digits' })
  @Length(6, 6, { message: 'transactionPin must be exactly 6 digits' })
  transactionPin: string;

  @ApiPropertyOptional({ description: 'Residential address', example: '12 Lagos Street, Abuja' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'URL of uploaded utility bill document', example: 'https://cdn.example.com/bills/abc.pdf' })
  @IsOptional()
  @IsString()
  utilityBillUrl?: string;

  @ApiPropertyOptional({ description: 'Referral code of the user who referred you', example: 'REF12345' })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiProperty({ description: 'Short-lived token obtained from POST /auth/validate-bvn', example: 'a1b2c3d4e5f6...' })
  @IsNotEmpty()
  @IsString()
  bvnValidationToken: string;
}
