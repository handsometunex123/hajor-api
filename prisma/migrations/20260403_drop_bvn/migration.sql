-- Migration: drop BVN column from User
-- Drops the `bvn` column and any stored values.
BEGIN;
ALTER TABLE "User" DROP COLUMN IF EXISTS bvn;
COMMIT;
