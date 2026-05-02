"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAlert = sendAlert;
const axios_1 = __importDefault(require("axios"));
async function sendAlert(title, details) {
    const webhook = process.env.ALERT_WEBHOOK_URL;
    const payload = {
        text: title,
        details: details || {},
        timestamp: new Date().toISOString(),
    };
    if (webhook) {
        try {
            await axios_1.default.post(webhook, payload, { timeout: 5000 });
            return;
        }
        catch (err) {
            console.error('Alert webhook failed', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
    }
    console.error('ALERT:', title, JSON.stringify(details));
}
exports.default = sendAlert;
//# sourceMappingURL=alert.js.map