-- Partial unique indexes to enforce uniqueness only for non-deleted rows
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_unique_active" ON "User"("email") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_unique_active" ON "User"("phone") WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_reference_unique_active" ON "Transaction"("reference") WHERE "deletedAt" IS NULL;
