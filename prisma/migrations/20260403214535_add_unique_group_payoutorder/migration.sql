/*
  Warnings:

  - A unique constraint covering the columns `[groupId,payoutOrder]` on the table `GroupContributor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GroupContributor_groupId_payoutOrder_key" ON "GroupContributor"("groupId", "payoutOrder");
