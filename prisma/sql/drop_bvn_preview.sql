-- Helper SQL: preview and remove BVN values
-- Run this to inspect how many User rows still have BVN values before applying migration.

-- Count non-null BVN values
SELECT COUNT(*) AS non_null_bvn_count FROM "User" WHERE bvn IS NOT NULL;

-- Sample rows (id, email, phone, bvn) - limit 20
SELECT id, email, phone, bvn FROM "User" WHERE bvn IS NOT NULL ORDER BY createdAt DESC LIMIT 20;

-- If you want to null the BVN values instead of dropping the column, uncomment:
-- UPDATE "User" SET bvn = NULL WHERE bvn IS NOT NULL;

-- If you prefer to drop the column directly via psql instead of using the migration, use:
-- ALTER TABLE "User" DROP COLUMN IF EXISTS bvn;
