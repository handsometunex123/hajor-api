// Helper to acquire Postgres advisory locks derived from a UUID.
// Uses pg_advisory_xact_lock so the lock is held for the current transaction scope.
export function uuidToBigIntKey(uuid: string): bigint {
  // take first 16 hex chars (64 bits) of UUID (without dashes)
  const hex = uuid.replace(/-/g, '').slice(0, 16);
  // BigInt from hex
  return BigInt('0x' + hex);
}

export async function acquireAdvisoryXactLock(tx: any, uuid: string) {
  const key = uuidToBigIntKey(uuid);
  // pg_advisory_xact_lock accepts two int4 or one int8. We provide single bigint.
  // Use parameterized query to avoid injection.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${key})`;
}
