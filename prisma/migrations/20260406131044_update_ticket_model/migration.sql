/*
  Warnings:

  - You are about to drop the column `description` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `requesterId` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `reviewNotes` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `reviewerId` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `Ticket` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Made the column `groupId` on table `Ticket` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_requesterId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_reviewerId_fkey";

-- DropIndex
DROP INDEX "Ticket_requesterId_idx";

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "description",
DROP COLUMN "metadata",
DROP COLUMN "requesterId",
DROP COLUMN "reviewNotes",
DROP COLUMN "reviewerId",
DROP COLUMN "subject",
ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "contributorId" TEXT,
ADD COLUMN     "newUserId" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "groupId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
