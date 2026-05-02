-- Migration: add metadata jsonb column to Invitation for OTP and invite data
-- Run with: npx prisma migrate deploy (or npx prisma migrate dev --name add-invitation-metadata)
ALTER TABLE IF EXISTS "Invitation" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
