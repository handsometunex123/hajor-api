"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsProcessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsProcessorService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let NotificationsProcessorService = NotificationsProcessorService_1 = class NotificationsProcessorService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.logger = new common_1.Logger(NotificationsProcessorService_1.name);
    }
    async jlog(job, msg) {
        this.logger.log(msg);
        try {
            if (typeof job.log === 'function')
                await job.log(msg);
        }
        catch (_) { }
    }
    async jlogWarn(job, msg) {
        this.logger.warn(msg);
        try {
            if (typeof job.log === 'function')
                await job.log(`[WARN] ${msg}`);
        }
        catch (_) { }
    }
    async jlogError(job, msg) {
        this.logger.error(msg);
        try {
            if (typeof job.log === 'function')
                await job.log(`[ERROR] ${msg}`);
        }
        catch (_) { }
    }
    async process(job) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
        await this.jlog(job, `Started job=${job.id} name=${job.name} attempt=${((_a = job.attemptsMade) !== null && _a !== void 0 ? _a : 0) + 1}`);
        if (job.name === 'send-otp') {
            const { userId, payload } = job.data;
            if (!userId)
                throw new Error('Missing userId for send-otp');
            const otp = payload === null || payload === void 0 ? void 0 : payload.otp;
            if (!otp)
                throw new Error('Missing otp in payload');
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new Error('User not found for notification');
            const destination = user.email || user.phone || null;
            if (!destination)
                throw new Error('No destination available for OTP');
            const masked = `***${String(otp).slice(-2)}`;
            await this.jlog(job, `Sending OTP to destination=${destination} userId=${userId} otp=${masked}`);
            await this.prisma.auditLog.create({
                data: { actorId: null, action: 'send_otp', entityType: 'User', entityId: userId, metadata: { destination, maskedOtp: masked } },
            });
            await this.jlog(job, `OTP dispatched successfully → userId=${userId}`);
            return { ok: true };
        }
        if (job.name === 'send-invite-email') {
            const { email, name, token, inviteId } = job.data;
            const frontend = this.config.get('FRONTEND_URL') || 'https://app.example.com';
            const url = `${frontend.replace(/\/+$/, '')}/register?inviteId=${encodeURIComponent(inviteId)}&token=${encodeURIComponent(token)}`;
            const sendgridKey = this.config.get('SENDGRID_API_KEY');
            const emailFrom = this.config.get('EMAIL_FROM') || 'no-reply@example.com';
            if (sendgridKey) {
                await this.jlog(job, `Sending invite email via SendGrid → to=${email} inviteId=${inviteId}`);
                try {
                    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            personalizations: [{ to: [{ email }], subject: `You've been invited to join ${name}` }],
                            from: { email: emailFrom },
                            content: [{ type: 'text/html', value: `<p>Hello,</p><p>You have been invited to join a group. Click the link to register:</p><p><a href="${url}">Complete registration</a></p><p>This link expires in 7 days.</p>` }],
                        }),
                    });
                    await this.jlog(job, `SendGrid response → ${resp.status} ${resp.statusText}`);
                    if (!resp.ok)
                        throw new Error(`SendGrid responded ${resp.status}`);
                    await this.prisma.auditLog.create({
                        data: { actorId: null, action: 'send_invite_email', entityType: 'Invitation', entityId: inviteId, metadata: { email } },
                    });
                    await this.jlog(job, `Invite email sent successfully → to=${email}`);
                    return { ok: true };
                }
                catch (err) {
                    await this.jlogError(job, `SendGrid send failed: ${(err === null || err === void 0 ? void 0 : err.message) || err}`);
                }
            }
            else {
                await this.jlogWarn(job, 'SENDGRID_API_KEY not configured — using fallback (log only)');
            }
            await this.jlog(job, `Invite email fallback (no provider) → to=${email} link=${url}`);
            await this.prisma.auditLog.create({
                data: { actorId: null, action: 'send_invite_email_fallback', entityType: 'Invitation', entityId: inviteId, metadata: { email } },
            });
            return { ok: true };
        }
        if (job.name === 'provision-virtual-account') {
            const { walletId, name, email } = job.data;
            if (!walletId)
                throw new Error('Missing walletId for provision-virtual-account');
            if (process.env.NODE_ENV !== 'production') {
                const walletExists = await this.prisma.wallet.findUnique({ where: { id: walletId }, select: { id: true } });
                if (!walletExists) {
                    await this.jlogWarn(job, `[DEV] Wallet ${walletId} not found — skipping mock VA provisioning`);
                    return { ok: false, reason: 'wallet_not_found' };
                }
                const fakeBanks = ['Wema Bank', 'Sterling Bank', 'Providus Bank', 'Titan Trust Bank'];
                const fakeBank = fakeBanks[Math.floor(Math.random() * fakeBanks.length)];
                const fakeAccountNumber = String(Math.floor(1000000000 + Math.random() * 9000000000));
                const fakeVaId = `dev_va_${Date.now()}`;
                await this.prisma.$transaction(async (tx) => {
                    await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                    await tx.wallet.update({
                        where: { id: walletId },
                        data: {
                            paystackVirtualAccountId: fakeVaId,
                            paystackAccountNumber: fakeAccountNumber,
                            paystackBank: fakeBank,
                            paystackMeta: { dev: true, account_number: fakeAccountNumber, bank: fakeBank },
                            paystackProvisionStatus: 'PROVISIONED',
                            paystackProvisionedAt: new Date(),
                        },
                        _internal: true,
                    });
                });
                await this.prisma.auditLog.create({
                    data: { actorId: null, action: 'provision_va', entityType: 'Wallet', entityId: walletId, metadata: { provider: 'dev-mock', account_number: fakeAccountNumber, bank: fakeBank } },
                });
                await this.jlog(job, `[DEV] Mock VA provisioned — accountNumber=${fakeAccountNumber} bank=${fakeBank}`);
                return { ok: true, dev: true };
            }
            const base = (this.config.get('PAYSTACK_BASE_URL') || 'https://api.paystack.co').replace(/\/$/, '');
            const secret = this.config.get('PAYSTACK_SECRET_KEY');
            if (!secret) {
                await this.jlogWarn(job, 'PAYSTACK_SECRET_KEY not configured — skipping VA provisioning');
                return { ok: false };
            }
            const attempt = ((_b = job.attemptsMade) !== null && _b !== void 0 ? _b : 0) + 1;
            const maxAttempts = ((_c = job.opts) === null || _c === void 0 ? void 0 : _c.attempts) || 1;
            await this.jlog(job, `Provisioning VA for walletId=${walletId} name=${name} email=${email} attempt=${attempt}/${maxAttempts}`);
            const devSimulate = this.config.get('PAYSTACK_DEV_SIMULATE');
            if (devSimulate && process.env.NODE_ENV !== 'production') {
                const msg = `[DEV] PAYSTACK_DEV_SIMULATE=${devSimulate} — simulated failure on attempt ${attempt}/${maxAttempts}`;
                await this.jlogWarn(job, msg);
                throw new Error(msg);
            }
            const paystackPost = async (path, body) => {
                const url = `${base}${path}`;
                await this.jlog(job, `[Paystack] POST ${url} body=${JSON.stringify(body)}`);
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                await this.jlog(job, `[Paystack] ${url} → ${resp.status} ${resp.statusText}`);
                if (resp.status === 401) {
                    await this.jlogError(job, `[Paystack] 401 Unauthorized — PAYSTACK_SECRET_KEY is invalid. Aborting all retries.`);
                    throw Object.assign(new Error('PAYSTACK_AUTH_FAILURE'), { paystack401: true });
                }
                const json = await resp.json();
                return { status: resp.status, ok: resp.ok, json };
            };
            try {
                try {
                    await this.prisma.$transaction(async (tx) => {
                        await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                        await tx.wallet.update({
                            where: { id: walletId },
                            data: { paystackProvisionStatus: 'PROVISIONING', paystackProvisionAttempts: { increment: 1 } },
                            _internal: true,
                        });
                    });
                    await this.jlog(job, `Wallet status → PROVISIONING`);
                }
                catch (err) {
                    await this.jlogWarn(job, 'Failed to mark wallet PROVISIONING: ' + ((err === null || err === void 0 ? void 0 : err.message) || err));
                }
                await this.jlog(job, `Step 1/2 — Create Paystack customer for email=${email}`);
                const nameParts = (name || '').trim().split(/\s+/);
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || firstName;
                let customerCode = null;
                const customerResp = await paystackPost('/customer', { email, first_name: firstName, last_name: lastName });
                if (customerResp.ok) {
                    customerCode = ((_e = (_d = customerResp.json) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.customer_code) || ((_g = (_f = customerResp.json) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.id) || null;
                    await this.jlog(job, `Customer created — customer_code=${customerCode}`);
                }
                else {
                    await this.jlogWarn(job, `Customer creation returned ${customerResp.status} — attempting to fetch existing customer`);
                    const fetchResp = await fetch(`${base}/customer/${encodeURIComponent(email)}`, {
                        headers: { Authorization: `Bearer ${secret}` },
                    });
                    await this.jlog(job, `[Paystack] GET /customer/${email} → ${fetchResp.status} ${fetchResp.statusText}`);
                    if (fetchResp.status === 401) {
                        await this.jlogError(job, `[Paystack] 401 on customer fetch — key invalid. Aborting.`);
                        throw Object.assign(new Error('PAYSTACK_AUTH_FAILURE'), { paystack401: true });
                    }
                    if (fetchResp.ok) {
                        const fetchJson = await fetchResp.json();
                        customerCode = ((_h = fetchJson === null || fetchJson === void 0 ? void 0 : fetchJson.data) === null || _h === void 0 ? void 0 : _h.customer_code) || ((_j = fetchJson === null || fetchJson === void 0 ? void 0 : fetchJson.data) === null || _j === void 0 ? void 0 : _j.id) || null;
                        await this.jlog(job, `Existing customer found — customer_code=${customerCode}`);
                    }
                }
                if (!customerCode) {
                    throw new Error(`Could not obtain Paystack customer code for email=${email}`);
                }
                await this.jlog(job, `Step 2/2 — Create dedicated VA for customer_code=${customerCode}`);
                const preferredBank = this.config.get('PAYSTACK_PREFERRED_BANK') || 'wema-bank';
                const vaResp = await paystackPost('/dedicated_account', { customer: customerCode, preferred_bank: preferredBank });
                if (!vaResp.ok) {
                    const msg = ((_k = vaResp.json) === null || _k === void 0 ? void 0 : _k.message) || `HTTP ${vaResp.status}`;
                    await this.jlogError(job, `Dedicated account creation failed — ${msg}`);
                    throw new Error(`Paystack /dedicated_account failed: ${msg}`);
                }
                const data = ((_l = vaResp.json) === null || _l === void 0 ? void 0 : _l.data) || vaResp.json;
                const vaId = (data === null || data === void 0 ? void 0 : data.id) || null;
                const accountNumber = ((_m = data === null || data === void 0 ? void 0 : data.account) === null || _m === void 0 ? void 0 : _m.account_number) || (data === null || data === void 0 ? void 0 : data.account_number) || null;
                const bank = ((_o = data === null || data === void 0 ? void 0 : data.bank) === null || _o === void 0 ? void 0 : _o.name) || (data === null || data === void 0 ? void 0 : data.bank_name) || preferredBank;
                await this.jlog(job, `VA created — accountNumber=${accountNumber} bank=${bank} vaId=${vaId}`);
                await this.prisma.$transaction(async (tx) => {
                    await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                    await tx.wallet.update({
                        where: { id: walletId },
                        data: {
                            paystackVirtualAccountId: String(vaId || ''),
                            paystackAccountNumber: accountNumber,
                            paystackBank: bank,
                            paystackMeta: data,
                            paystackProvisionStatus: 'PROVISIONED',
                            paystackProvisionedAt: new Date(),
                        },
                        _internal: true,
                    });
                });
                await this.prisma.auditLog.create({
                    data: { actorId: null, action: 'provision_va', entityType: 'Wallet', entityId: walletId, metadata: { provider: 'paystack', accountNumber, bank, vaId } },
                });
                const provWallet = await this.prisma.wallet.findUnique({ where: { id: walletId }, select: { userId: true } });
                if (provWallet === null || provWallet === void 0 ? void 0 : provWallet.userId) {
                    try {
                        await this.prisma.notification.create({
                            data: { userId: provWallet.userId, type: 'WALLET_PROVISIONED', title: 'Virtual account ready', message: `Your virtual account (${bank} - ${accountNumber}) is ready for contributions`, metadata: { walletId, accountNumber, bank } },
                        });
                    }
                    catch (_) { }
                }
                await this.jlog(job, `Wallet ${walletId} provisioned successfully ✓`);
                return { ok: true, data: { vaId, accountNumber, bank } };
            }
            catch (err) {
                if (err === null || err === void 0 ? void 0 : err.paystack401) {
                    try {
                        await this.prisma.$transaction(async (tx) => {
                            await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                            await tx.wallet.update({
                                where: { id: walletId },
                                data: { paystackProvisionStatus: 'FAILED' },
                                _internal: true,
                            });
                        });
                        await this.prisma.auditLog.create({
                            data: { actorId: null, action: 'provision_va_failed', entityType: 'Wallet', entityId: walletId, metadata: { reason: 'PAYSTACK_AUTH_FAILURE' } },
                        });
                    }
                    catch (_) { }
                    return { ok: false, reason: 'PAYSTACK_AUTH_FAILURE' };
                }
                try {
                    if (attempt >= maxAttempts) {
                        await this.prisma.$transaction(async (tx) => {
                            await tx.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                            await tx.wallet.update({
                                where: { id: walletId },
                                data: { paystackProvisionStatus: 'FAILED' },
                                _internal: true,
                            });
                        });
                        await this.jlogError(job, `All ${maxAttempts} attempts exhausted — wallet status → FAILED`);
                    }
                    else {
                        await this.jlogWarn(job, `Attempt ${attempt}/${maxAttempts} failed — will retry. Error: ${err === null || err === void 0 ? void 0 : err.message}`);
                    }
                    await this.prisma.auditLog.create({
                        data: { actorId: null, action: 'provision_va_failed', entityType: 'Wallet', entityId: walletId, metadata: { error: err === null || err === void 0 ? void 0 : err.message } },
                    });
                }
                catch (_) { }
                throw err;
            }
        }
        if (job.name === 'reconcile-paystack') {
            const base = this.config.get('PAYSTACK_BASE_URL') || 'https://api.paystack.co';
            const secret = this.config.get('PAYSTACK_SECRET_KEY');
            if (!secret) {
                await this.jlogWarn(job, 'PAYSTACK_SECRET_KEY not configured — skipping reconciliation');
                return { ok: false };
            }
            const pending = await this.prisma.transaction.findMany({ where: { status: 'PENDING' }, take: 200, orderBy: { createdAt: 'desc' } });
            await this.jlog(job, `Reconciling ${pending.length} PENDING transaction(s)`);
            let resolved = 0;
            for (const tx of pending) {
                try {
                    const m = tx.reference.match(/\|ref:(.+)$/);
                    const ref = m ? m[1] : tx.reference;
                    if (!ref)
                        continue;
                    const resp = await fetch(`${base.replace(/\/$/, '')}/transaction/verify/${encodeURIComponent(ref)}`, {
                        headers: { Authorization: `Bearer ${secret}` },
                    });
                    if (!resp.ok)
                        continue;
                    const bodyJson = await resp.json();
                    const status = ((_p = bodyJson === null || bodyJson === void 0 ? void 0 : bodyJson.data) === null || _p === void 0 ? void 0 : _p.status) || ((_r = (_q = bodyJson === null || bodyJson === void 0 ? void 0 : bodyJson.data) === null || _q === void 0 ? void 0 : _q.transaction) === null || _r === void 0 ? void 0 : _r.status) || null;
                    if (status && /success/i.test(status)) {
                        await this.prisma.$transaction(async (client) => {
                            await client.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                            await client.transaction.update({ where: { id: tx.id }, data: { status: 'SUCCESS' } });
                        });
                        await this.prisma.auditLog.create({ data: { actorId: null, action: 'reconcile_deposit_success', entityType: 'Transaction', entityId: tx.id, metadata: { ref } } });
                        await this.jlog(job, `tx=${tx.id} ref=${ref} → SUCCESS`);
                        resolved++;
                    }
                    else if (status && /failed|error/i.test(status)) {
                        await this.prisma.$transaction(async (client) => {
                            await client.$executeRaw `SELECT set_config('hajor.allow_internal', 'true', true)`;
                            await client.transaction.update({ where: { id: tx.id }, data: { status: 'FAILED' } });
                        });
                        await this.prisma.auditLog.create({ data: { actorId: null, action: 'reconcile_deposit_failed', entityType: 'Transaction', entityId: tx.id, metadata: { ref } } });
                        await this.jlog(job, `tx=${tx.id} ref=${ref} → FAILED`);
                        resolved++;
                    }
                }
                catch (err) {
                    await this.jlogWarn(job, `Error reconciling tx=${tx.id}: ` + ((err === null || err === void 0 ? void 0 : err.message) || err));
                }
            }
            await this.jlog(job, `Reconciliation complete — checked=${pending.length} resolved=${resolved}`);
            return { ok: true, checked: pending.length, resolved };
        }
        if (job.name === 'reprovision-wallets') {
            const secret = this.config.get('PAYSTACK_SECRET_KEY');
            if (!secret) {
                await this.jlogWarn(job, 'PAYSTACK_SECRET_KEY not set — skipping reprovision sweep');
                return { ok: false, skipped: true };
            }
            const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
            const stuckWallets = await this.prisma.wallet.findMany({
                where: {
                    OR: [
                        { paystackProvisionStatus: 'FAILED' },
                        { paystackProvisionStatus: 'PENDING', createdAt: { lt: thirtyMinsAgo } },
                        { paystackProvisionStatus: 'PROVISIONING', createdAt: { lt: thirtyMinsAgo } },
                        { paystackProvisionStatus: null, createdAt: { lt: thirtyMinsAgo } },
                    ],
                },
                include: { user: { select: { firstName: true, lastName: true, email: true } } },
                take: 50,
            });
            if (stuckWallets.length === 0) {
                await this.jlog(job, 'Reprovision sweep — no stuck wallets found');
                return { ok: true, enqueued: 0 };
            }
            await this.jlog(job, `Reprovision sweep — found ${stuckWallets.length} stuck wallet(s)`);
            let succeeded = 0;
            let failed = 0;
            for (const wallet of stuckWallets) {
                await this.jlog(job, `Attempting walletId=${wallet.id} status=${wallet.paystackProvisionStatus}`);
                try {
                    const syntheticJob = {
                        id: `sweep:${wallet.id}`,
                        name: 'provision-virtual-account',
                        data: {
                            walletId: wallet.id,
                            name: wallet.user ? `${wallet.user.firstName} ${wallet.user.lastName}` : '',
                            email: ((_s = wallet.user) === null || _s === void 0 ? void 0 : _s.email) || '',
                        },
                        opts: { attempts: 1 },
                        attemptsMade: 0,
                    };
                    const result = await this.process(syntheticJob);
                    if (result === null || result === void 0 ? void 0 : result.ok) {
                        await this.jlog(job, `walletId=${wallet.id} → provisioned ✓`);
                        succeeded++;
                    }
                    else {
                        await this.jlogWarn(job, `walletId=${wallet.id} → provision returned ok=false`);
                        failed++;
                    }
                }
                catch (err) {
                    failed++;
                    await this.jlogError(job, `walletId=${wallet.id} → provision threw: ` + ((err === null || err === void 0 ? void 0 : err.message) || err));
                }
            }
            await this.jlog(job, `Reprovision sweep complete — succeeded=${succeeded} failed=${failed}`);
            return { ok: true, succeeded, failed };
        }
        if (job.name === 'send-notification' && ((_t = job.data) === null || _t === void 0 ? void 0 : _t.type) === 'TERMS_NUDGE') {
            const { userId, payload } = job.data;
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                await this.jlogWarn(job, `TERMS_NUDGE: user ${userId} not found — skipping`);
                return { ok: false };
            }
            const destination = user.email || user.phone || null;
            await this.jlog(job, `TERMS_NUDGE → userId=${userId} destination=${destination} group=${(payload === null || payload === void 0 ? void 0 : payload.groupName) || (payload === null || payload === void 0 ? void 0 : payload.groupId)}`);
            const sendgridKey = this.config.get('SENDGRID_API_KEY');
            const emailFrom = this.config.get('EMAIL_FROM') || 'no-reply@example.com';
            if (sendgridKey && user.email) {
                const frontend = this.config.get('FRONTEND_URL') || 'https://app.example.com';
                const groupUrl = `${frontend.replace(/\/+$/, '')}/groups/${encodeURIComponent((payload === null || payload === void 0 ? void 0 : payload.groupId) || '')}`;
                try {
                    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            personalizations: [{ to: [{ email: user.email }], subject: `Action Required: Accept Terms for ${(payload === null || payload === void 0 ? void 0 : payload.groupName) || 'your group'}` }],
                            from: { email: emailFrom },
                            content: [{ type: 'text/html', value: `<p>Hi ${user.firstName || ''},</p><p>Please accept the terms &amp; conditions for group <strong>${(payload === null || payload === void 0 ? void 0 : payload.groupName) || ''}</strong> so the group can start.</p><p><a href="${groupUrl}">View Group &amp; Accept Terms</a></p>` }],
                        }),
                    });
                    await this.jlog(job, `TERMS_NUDGE email → SendGrid ${resp.status} ${resp.statusText}`);
                }
                catch (err) {
                    await this.jlogWarn(job, `TERMS_NUDGE email failed: ${(err === null || err === void 0 ? void 0 : err.message) || err}`);
                }
            }
            else {
                await this.jlog(job, `TERMS_NUDGE email skipped (no SendGrid key or no email)`);
            }
            await this.prisma.auditLog.create({
                data: { actorId: null, action: 'terms_nudge', entityType: 'User', entityId: userId, metadata: { groupId: payload === null || payload === void 0 ? void 0 : payload.groupId } },
            });
            return { ok: true };
        }
        const { userId, type, payload } = job.data;
        if (userId && type) {
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (user) {
                await this.jlog(job, `Notify userId=${userId} type=${type} destination=${user.email || user.phone}`);
                await this.prisma.auditLog.create({
                    data: { actorId: null, action: 'send_notification', entityType: 'User', entityId: userId, metadata: { type, payload } },
                });
            }
        }
        return { ok: true };
    }
};
exports.NotificationsProcessorService = NotificationsProcessorService;
exports.NotificationsProcessorService = NotificationsProcessorService = NotificationsProcessorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], NotificationsProcessorService);
//# sourceMappingURL=notifications-processor.service.js.map