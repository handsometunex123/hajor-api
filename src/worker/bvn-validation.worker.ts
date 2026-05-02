
import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { KycService } from '../modules/users/kyc.service';
import { Worker, Job } from 'bullmq';

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisDb = parseInt(process.env.REDIS_DB || '0', 10);
const connection = { host: redisHost, port: redisPort, db: redisDb };

const prisma = new PrismaClient();
const prismaService = new PrismaService();
const configService = new ConfigService();
const kycService = new KycService(configService);
if (prismaService.$connect) prismaService.$connect();

async function processBvnValidation(job: Job) {
  const { userId, bvn, firstName, lastName, dob, phone } = job.data;
  console.log(`Retrying BVN validation for user ${userId}`);
  const user = await prismaService.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.warn(`User not found: ${userId}`);
    return;
  }
  try {
    const result = await kycService.verifyBvn(bvn, { firstName, lastName, dob, phone });
    const bvnData = result.data;
    const normalize = (s: string) => (s || '').trim().toLowerCase();
    if (
      bvnData &&
      normalize(bvnData.firstName) === normalize(firstName) &&
      normalize(bvnData.lastName) === normalize(lastName) &&
      (!dob || !bvnData.dateOfBirth || normalize(bvnData.dateOfBirth) === normalize(dob)) &&
      result.success
    ) {
      // Update user as verified
      await prismaService.user.update({
        where: { id: userId },
        data: {
          bvnVerified: true,
          bvnVerifiedAt: new Date(),
          bvnVerificationRef: bvnData.verificationId,
          kycTier: 1,
        },
      });
      console.log(`User ${userId} BVN verified successfully.`);
    } else {
      console.warn(`User ${userId} BVN details did not match or verification failed.`);
    }
  } catch (err) {
    console.error(`BVN validation retry failed for user ${userId}:`, err);
    // Optionally, re-enqueue or escalate after max attempts
  }
}

const worker = new Worker('bvn-validation-retry', processBvnValidation, { connection });
worker.on('completed', (job) => console.log(`BVN validation job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`BVN validation job ${job?.id} failed: ${err?.message}`));

const shutdown = async () => {
  try { await worker.close(); } catch (err) { console.error('Error closing BVN worker', err); }
  try { await prisma.$disconnect(); } catch (err) {}
  try { await prismaService.$disconnect(); } catch (err) {}
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
