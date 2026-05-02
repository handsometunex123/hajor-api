-- AlterTable
ALTER TABLE "GroupJoinRequest" ADD COLUMN     "acceptedTerms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "adminAcceptedIndemnity" BOOLEAN NOT NULL DEFAULT false;
