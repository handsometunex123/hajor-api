import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
import { JsonObject } from '../../common/types/json';

export class ProviderChargeDto {
  @IsNotEmpty()
  @IsString()
  provider: string; // e.g. 'stripe'

  @IsNotEmpty()
  @IsString()
  providerId: string; // provider charge id

  @IsNotEmpty()
  @IsString()
  walletOwnerId: string; // internal user id for the wallet owner

  @IsNotEmpty()
  @IsString()
  reference: string; // internal business reference (e.g. contribution payment id)

  @IsNotEmpty()
  @IsNumber()
  amount: number; // amount in major units (e.g. 100.00)

  @IsOptional()
  metadata?: JsonObject;
}

export class ProviderPayoutDto {
  @IsNotEmpty()
  @IsString()
  provider: string;

  @IsNotEmpty()
  @IsString()
  providerId: string; // provider payout id

  @IsNotEmpty()
  @IsString()
  reference: string; // e.g. payout:<cycleId>

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsOptional()
  metadata?: JsonObject;
}
