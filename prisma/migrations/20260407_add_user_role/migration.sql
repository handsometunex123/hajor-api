-- Convert from isProxyUser boolean + env-var ADMIN hack to a formal UserRole enum

-- 1. Create the enum type
CREATE TYPE "UserRole" AS ENUM ('USER', 'PROXY', 'SUPER_ADMIN');

-- 2. Add role column (default USER for everyone)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';

-- 3. Migrate existing proxy users
UPDATE "User" SET "role" = 'PROXY' WHERE "isProxyUser" = TRUE;

-- 4. Drop the now-redundant isProxyUser column and its index
DROP INDEX IF EXISTS "User_isProxyUser_idx";
ALTER TABLE "User" DROP COLUMN IF EXISTS "isProxyUser";

-- 5. Create index on role for fast filtering
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
