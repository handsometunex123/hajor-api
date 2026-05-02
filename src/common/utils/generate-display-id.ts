import { randomBytes } from 'crypto';

const MAX_RETRIES = 5;

/**
 * Generates a unique, visually intuitive displayId for a group contributor.
 *
 * Format: HAJOR-{FIRST3}{LAST3}-{SLOT}-{RANDOM8}
 * Example: HAJOR-JOHDOE-1-A3B7XK9M
 *
 * Uses crypto.randomBytes for strong randomness (8-char base-36 suffix ≈ 41 bits
 * of entropy → ~2.8 trillion combinations per name+slot namespace).
 *
 * Retries up to 5 times on unique-constraint collision so a duplicate
 * never surfaces as an unhandled error.
 */
export function buildDisplayId(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  slotNumber: number,
): string {
  const firstPart = (firstName || 'XXX').substring(0, 3).toUpperCase();
  const lastPart = (lastName || 'XXX').substring(0, 3).toUpperCase();
  const suffix = randomBytes(6).toString('base64url').substring(0, 8).toUpperCase();
  return `HAJOR-${firstPart}${lastPart}-${slotNumber}-${suffix}`;
}

/**
 * Creates a GroupContributor with a collision-safe displayId.
 *
 * Wraps the insert in a retry loop — if the randomly generated displayId
 * collides with an existing one (unique constraint P2002), a new suffix is
 * generated and the insert is retried (up to 5 times).
 */
export async function createContributorWithDisplayId(
  tx: { groupContributor: { create: (args: any) => Promise<any> } },
  data: {
    groupId: string;
    userId: string;
    firstName: string | null | undefined;
    lastName: string | null | undefined;
    slotNumber: number;
  },
  extra?: Record<string, any>,
): Promise<any> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const displayId = buildDisplayId(data.firstName, data.lastName, data.slotNumber);
    try {
      return await tx.groupContributor.create({
        data: { groupId: data.groupId, userId: data.userId, displayId, ...extra },
      });
    } catch (err: any) {
      const isUniqueViolation =
        err?.code === 'P2002' ||
        (err?.message && err.message.includes('Unique constraint'));
      if (!isUniqueViolation || attempt === MAX_RETRIES - 1) throw err;
    }
  }
}
