/**
 * Backfill script: assign payoutOrder to group contributors that don't have one.
 *
 * Logic:
 *   - NOT_STARTED groups: fully reassign payoutOrder for ALL contributors in
 *     joinedAt ascending order (1, 2, 3 ...). Safe because no cycles exist yet.
 *   - STARTED / COMPLETED groups: only fill NULL payoutOrders. Existing values
 *     are preserved to avoid disrupting active/completed payout cycles.
 *     NULLs are assigned the next available number after the current maximum.
 *
 * Run (dry-run — prints changes but writes nothing):
 *   ts-node prisma/scripts/backfill-payout-order.ts
 *
 * Run (apply changes):
 *   ts-node prisma/scripts/backfill-payout-order.ts --apply
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes('--apply');

async function main() {
  if (DRY_RUN) {
    console.log('=== DRY RUN — pass --apply to write changes ===\n');
  } else {
    console.log('=== APPLYING changes to the database ===\n');
  }

  const groups = await prisma.group.findMany({
    select: { id: true, name: true, status: true, adminId: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${groups.length} group(s) total.\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const group of groups) {
    const contributors = await prisma.groupContributor.findMany({
      where: { groupId: group.id },
      orderBy: { joinedAt: 'asc' },
      select: { id: true, displayId: true, payoutOrder: true, joinedAt: true },
    });

    if (contributors.length === 0) {
      console.log(`[${group.name}] (${group.status}) — no contributors, skipping.`);
      continue;
    }

    const updates: { id: string; displayId: string | null; from: number | null; to: number }[] = [];

    if (group.status === 'NOT_STARTED') {
      // Full reassign in joinedAt order
      contributors.forEach((c, idx) => {
        const desired = idx + 1;
        if (c.payoutOrder !== desired) {
          updates.push({ id: c.id, displayId: c.displayId, from: c.payoutOrder, to: desired });
        }
      });
    } else {
      // STARTED or COMPLETED — only fill NULLs
      const assigned = contributors
        .map((c) => c.payoutOrder)
        .filter((o): o is number => o !== null);

      const maxAssigned = assigned.length > 0 ? Math.max(...assigned) : 0;
      let next = maxAssigned + 1;

      for (const c of contributors) {
        if (c.payoutOrder === null) {
          updates.push({ id: c.id, displayId: c.displayId, from: null, to: next });
          next++;
        }
      }
    }

    if (updates.length === 0) {
      console.log(`[${group.name}] (${group.status}) — ${contributors.length} contributor(s), all already assigned. OK`);
      totalSkipped += contributors.length;
      continue;
    }

    console.log(`[${group.name}] (${group.status}) — ${contributors.length} contributor(s), ${updates.length} to update:`);
    for (const u of updates) {
      console.log(`  ${u.displayId ?? u.id}: payoutOrder ${u.from ?? 'NULL'} → ${u.to}`);
    }

    if (!DRY_RUN) {
      // Use a temp-value strategy to avoid unique constraint conflicts during swap
      // Step 1: set all to negatives
      for (const u of updates) {
        await prisma.groupContributor.update({
          where: { id: u.id },
          data: { payoutOrder: -(u.to) },
        });
      }
      // Step 2: set final positive values
      for (const u of updates) {
        await prisma.groupContributor.update({
          where: { id: u.id },
          data: { payoutOrder: u.to },
        });
      }

      await prisma.auditLog.create({
        data: {
          actorId: group.adminId,
          action: 'backfill_payout_order',
          entityType: 'Group',
          entityId: group.id,
          metadata: {
            updates: updates.map((u) => ({ id: u.id, from: u.from, to: u.to })),
          },
        },
      });

      console.log(`  ✓ Written.`);
    }

    totalUpdated += updates.length;
    totalSkipped += contributors.length - updates.length;
  }

  console.log(`\nDone. ${totalUpdated} contributor(s) ${DRY_RUN ? 'would be' : 'were'} updated. ${totalSkipped} already correct.`);

  if (DRY_RUN && totalUpdated > 0) {
    console.log('\nRe-run with --apply to write these changes.');
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
