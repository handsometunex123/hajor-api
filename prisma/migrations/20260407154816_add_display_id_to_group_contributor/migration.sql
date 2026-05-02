/*
  Warnings:

  - A unique constraint covering the columns `[displayId]` on the table `GroupContributor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `displayId` to the `GroupContributor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GroupContributor" ADD COLUMN     "displayId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "GroupContributor_displayId_key" ON "GroupContributor"("displayId");
