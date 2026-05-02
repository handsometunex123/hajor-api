-- ALTER TABLE "User" DROP CONSTRAINT "User_referredById_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bvnVerificationRef" TEXT,
ADD COLUMN     "bvnVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "kycTier" INTEGER;

-- AddForeignKey
-- ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
