
-- Ensure resolvedAt column exists (create if missing)

ALTER TABLE "Dispute" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "frozenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Group" ALTER COLUMN "frozenAt" SET DATA TYPE TIMESTAMP(3);
