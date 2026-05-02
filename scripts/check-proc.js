require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw`SELECT proname, pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname='accounting' AND proname='create_double_entry'`;
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
})();
