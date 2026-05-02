"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDisplayId = buildDisplayId;
exports.createContributorWithDisplayId = createContributorWithDisplayId;
const crypto_1 = require("crypto");
const MAX_RETRIES = 5;
function buildDisplayId(firstName, lastName, slotNumber) {
    const firstPart = (firstName || 'XXX').substring(0, 3).toUpperCase();
    const lastPart = (lastName || 'XXX').substring(0, 3).toUpperCase();
    const suffix = (0, crypto_1.randomBytes)(6).toString('base64url').substring(0, 8).toUpperCase();
    return `HAJOR-${firstPart}${lastPart}-${slotNumber}-${suffix}`;
}
async function createContributorWithDisplayId(tx, data, extra) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const displayId = buildDisplayId(data.firstName, data.lastName, data.slotNumber);
        try {
            return await tx.groupContributor.create({
                data: { groupId: data.groupId, userId: data.userId, displayId, ...extra },
            });
        }
        catch (err) {
            const isUniqueViolation = (err === null || err === void 0 ? void 0 : err.code) === 'P2002' ||
                ((err === null || err === void 0 ? void 0 : err.message) && err.message.includes('Unique constraint'));
            if (!isUniqueViolation || attempt === MAX_RETRIES - 1)
                throw err;
        }
    }
}
//# sourceMappingURL=generate-display-id.js.map