-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CYCLE_RESCHEDULE_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'CYCLE_RESCHEDULE_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'CYCLE_RESCHEDULE_REJECTED';

-- AlterEnum
ALTER TYPE "TicketType" ADD VALUE 'CYCLE_RESCHEDULE';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "cycleId" TEXT,
ADD COLUMN     "requestedDate" TIMESTAMP(3);
