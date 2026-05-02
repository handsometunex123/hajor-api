-- Safe cleanup: drop legacy `slots` column from GroupContributor if it exists.
-- This uses IF EXISTS and CASCADE to remove dependent objects safely.
-- Run this against your production DB only after verifying backups.

ALTER TABLE "GroupContributor" DROP COLUMN IF EXISTS "slots" CASCADE;

-- Optionally inspect remaining constraints/indexes for (groupId,userId)
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = '"GroupContributor"'::regclass;
