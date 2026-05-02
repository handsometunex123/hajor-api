-- List duplicate (groupId, payoutOrder) where payoutOrder is not null
SELECT "groupId", "payoutOrder", count(*) as cnt
FROM "GroupContributor"
WHERE "payoutOrder" IS NOT NULL
GROUP BY "groupId", "payoutOrder"
HAVING count(*) > 1;
