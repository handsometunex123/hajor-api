import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, Matches } from 'class-validator';

export class ProxyRegisterInitDto {
  @ApiProperty({ description: 'First name of the person being registered', example: 'Amina' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Last name of the person being registered', example: 'Musa' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'Phone number (OTP will be sent here)', example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiPropertyOptional({
    description: 'Email address. If omitted a placeholder is auto-generated (proxy.PHONE@internal.hajor.app).',
    example: 'amina@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
