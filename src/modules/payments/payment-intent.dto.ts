import { IsNotEmpty, IsString, IsOptional, IsEmail } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsNotEmpty()
  @IsString()
  cycleId: string;

  @IsNotEmpty()
  @IsString()
  groupContributorId: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
