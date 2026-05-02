"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uuidToBigIntKey = uuidToBigIntKey;
exports.acquireAdvisoryXactLock = acquireAdvisoryXactLock;
function uuidToBigIntKey(uuid) {
    const hex = uuid.replace(/-/g, '').slice(0, 16);
    return BigInt('0x' + hex);
}
async function acquireAdvisoryXactLock(tx, uuid) {
    const key = uuidToBigIntKey(uuid);
    await tx.$executeRaw `SELECT pg_advisory_xact_lock(${key})`;
}
//# sourceMappingURL=advisory-lock.js.map