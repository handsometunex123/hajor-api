import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@local.test';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    admin = await prisma.user.create({
      data: {
        firstName: 'Admin',
        lastName: 'User',
        email: adminEmail,
        phone: '0000000000',
        password: hashed,
        isVerified: true,
        trustScore: 100,
        role: 'SUPER_ADMIN',
      },
    });

    await prisma.wallet.create({ data: { userId: admin.id } });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'seed_create_admin',
        entityType: 'User',
        entityId: admin.id,
        metadata: { email: adminEmail },
      },
    });

    console.log(`Created admin user ${adminEmail}`);
  } else {
    console.log(`Admin user ${adminEmail} already exists`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
