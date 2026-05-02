-- CreateEnum
CREATE TYPE "JoinMethod" AS ENUM ('join_request', 'admin_add', 'invitation', 'migration', 'self_signup', 'api');

-- AlterTable
ALTER TABLE "GroupContributor" ADD COLUMN     "joinMethod" "JoinMethod" NOT NULL DEFAULT 'join_request';
