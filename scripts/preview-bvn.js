const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.$queryRaw`SELECT COUNT(*)::int AS non_null_bvn_count FROM "User" WHERE bvn IS NOT NULL`;
    console.log('non_null_bvn_count:', count[0]?.non_null_bvn_count ?? 0);

    const rows = await prisma.$queryRaw`SELECT id, email, phone, bvn FROM "User" WHERE bvn IS NOT NULL ORDER BY "createdAt" DESC LIMIT 20`;
    console.log('sample rows (up to 20):');
    console.table(rows);
  } catch (err) {
    console.error('Error running preview:', err);
    process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main();
