/*
  Warnings:

  - You are about to drop the column `adminIndemnityText` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `terms` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `walletProvisioned` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_referredById_fkey";

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "adminIndemnityText",
DROP COLUMN "terms";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "walletProvisioned";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
