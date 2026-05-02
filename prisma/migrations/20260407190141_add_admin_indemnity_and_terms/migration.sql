-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "adminIndemnityAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "adminIndemnityAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "adminIndemnityIpAddress" TEXT,
ADD COLUMN     "adminIndemnityText" TEXT,
ADD COLUMN     "terms" TEXT;

-- AlterTable
ALTER TABLE "GroupContributor" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);
