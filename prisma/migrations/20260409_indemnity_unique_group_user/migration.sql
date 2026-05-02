-- Make IndemnityForm unique per group + user (indemnity is at the group-user level)
-- First deduplicate: keep the earliest form per (groupId, addedUserId)
DELETE FROM "IndemnityForm"
WHERE id NOT IN (
  SELECT DISTINCT ON ("groupId", "addedUserId") id
  FROM "IndemnityForm"
  ORDER BY "groupId", "addedUserId", "createdAt" ASC
);

-- CreateIndex
CREATE UNIQUE INDEX "IndemnityForm_groupId_addedUserId_key" ON "IndemnityForm"("groupId", "addedUserId");
