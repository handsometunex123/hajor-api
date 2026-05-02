-- Add Paystack virtual account fields to Wallet
ALTER TABLE IF EXISTS "Wallet"
ADD COLUMN IF NOT EXISTS "paystackVirtualAccountId" text;
ALTER TABLE IF EXISTS "Wallet"
ADD COLUMN IF NOT EXISTS "paystackAccountNumber" text;
ALTER TABLE IF EXISTS "Wallet"
ADD COLUMN IF NOT EXISTS "paystackBank" text;
ALTER TABLE IF EXISTS "Wallet"
ADD COLUMN IF NOT EXISTS "paystackMeta" jsonb;
