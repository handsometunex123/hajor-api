-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "firstContributionDate" TIMESTAMP(3),
ADD COLUMN     "gracePeriodDays" INTEGER NOT NULL DEFAULT 1;
