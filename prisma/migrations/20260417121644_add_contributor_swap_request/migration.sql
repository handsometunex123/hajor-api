-- CreateEnum
CREATE TYPE "ContributorSwapStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SWAP_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'SWAP_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'SWAP_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'SWAP_EXECUTED';

-- CreateTable
CREATE TABLE "ContributorSwapRequest" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "contributorAId" TEXT NOT NULL,
    "contributorBId" TEXT NOT NULL,
    "status" "ContributorSwapStatus" NOT NULL DEFAULT 'PENDING',
    "contributorAApprovedAt" TIMESTAMP(3),
    "contributorBApprovedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributorSwapRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContributorSwapRequest_groupId_idx" ON "ContributorSwapRequest"("groupId");

-- CreateIndex
CREATE INDEX "ContributorSwapRequest_requestedById_idx" ON "ContributorSwapRequest"("requestedById");

-- CreateIndex
CREATE INDEX "ContributorSwapRequest_contributorAId_idx" ON "ContributorSwapRequest"("contributorAId");

-- CreateIndex
CREATE INDEX "ContributorSwapRequest_contributorBId_idx" ON "ContributorSwapRequest"("contributorBId");

-- CreateIndex
CREATE INDEX "ContributorSwapRequest_status_idx" ON "ContributorSwapRequest"("status");

-- AddForeignKey
ALTER TABLE "ContributorSwapRequest" ADD CONSTRAINT "ContributorSwapRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributorSwapRequest" ADD CONSTRAINT "ContributorSwapRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributorSwapRequest" ADD CONSTRAINT "ContributorSwapRequest_contributorAId_fkey" FOREIGN KEY ("contributorAId") REFERENCES "GroupContributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributorSwapRequest" ADD CONSTRAINT "ContributorSwapRequest_contributorBId_fkey" FOREIGN KEY ("contributorBId") REFERENCES "GroupContributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
