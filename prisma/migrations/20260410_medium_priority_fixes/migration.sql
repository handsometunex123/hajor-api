-- AlterEnum: add EMAIL_VERIFICATION to NotificationType
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EMAIL_VERIFICATION';

-- AlterTable: add emailVerifiedAt to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

-- AlterEnum: add CANCELLED to GroupStatus
ALTER TYPE "GroupStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- AlterEnum: add DEFAULTED to ContributionPaymentStatus
ALTER TYPE "ContributionPaymentStatus" ADD VALUE IF NOT EXISTS 'DEFAULTED';

-- AlterTable: add termsVersion to Group
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "termsVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable: add termsVersionAccepted to GroupContributor
ALTER TABLE "GroupContributor" ADD COLUMN IF NOT EXISTS "termsVersionAccepted" INTEGER;

-- AlterTable: add expiresAt to Invitation
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- AlterTable: add completedAt to ContributionCycle
ALTER TABLE "ContributionCycle" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

-- AlterEnum: add GROUP_CANCELLED to NotificationType
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'GROUP_CANCELLED';

-- AlterEnum: add PAYMENT_DEFAULTED to NotificationType
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_DEFAULTED';

-- Fix displayId uniqueness: change from global unique to per-group unique
DROP INDEX IF EXISTS "GroupContributor_displayId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "GroupContributor_groupId_displayId_key" ON "GroupContributor"("groupId", "displayId");

-- AlterEnum: add WALLET_PROVISIONED to NotificationType
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WALLET_PROVISIONED';
