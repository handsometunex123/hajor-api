const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const res = await prisma.$queryRaw`SELECT "groupId", "payoutOrder", count(*) as cnt FROM "GroupContributor" WHERE "payoutOrder" IS NOT NULL GROUP BY "groupId", "payoutOrder" HAVING count(*) > 1`;
    if (!res || res.length === 0) {
      console.log('No duplicates found');
    } else {
      console.log('Duplicates:');
      console.table(res);
    }
  } catch (err) {
    console.error('Error querying DB:', err.message || err);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
})();
