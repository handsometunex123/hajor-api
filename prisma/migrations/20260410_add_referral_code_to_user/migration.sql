-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referralCode" TEXT UNIQUE,
ADD COLUMN     "referredById" TEXT,
ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"(id) ON DELETE SET NULL;

-- CreateIndex
CREATE INDEX "User_referralCode_idx" ON "User"("referralCode");
CREATE INDEX "User_referredById_idx" ON "User"("referredById");
