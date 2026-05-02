"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const response_transform_interceptor_1 = require("./common/interceptors/response-transform.interceptor");
const app_module_1 = require("./app.module");
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const helmet_1 = __importDefault(require("helmet"));
const Sentry = __importStar(require("@sentry/node"));
const promClient = __importStar(require("prom-client"));
const crypto_1 = require("crypto");
const swagger_1 = require("@nestjs/swagger");
const api_1 = require("@bull-board/api");
const bullMQAdapter_1 = require("@bull-board/api/bullMQAdapter");
const express_1 = require("@bull-board/express");
const health_module_1 = require("./health/health.module");
const throttler_1 = require("@nestjs/throttler");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const contributions_module_1 = require("./modules/contributions/contributions.module");
const disputes_module_1 = require("./modules/disputes/disputes.module");
const fraud_module_1 = require("./modules/fraud/fraud.module");
const groups_module_1 = require("./modules/groups/groups.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const payouts_module_1 = require("./modules/payouts/payouts.module");
const transactions_module_1 = require("./modules/transactions/transactions.module");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const chat_module_1 = require("./modules/chat/chat.module");
const ticket_module_1 = require("./modules/tickets/ticket.module");
const queue_service_1 = require("./infrastructure/queue/queue.service");
const isProduction = process.env.NODE_ENV === 'production';
const logger = (0, pino_1.default)({
    level: (_a = process.env.LOG_LEVEL) !== null && _a !== void 0 ? _a : 'info',
    transport: !isProduction
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
            },
        }
        : undefined,
});
if (isProduction && !process.env.JWT_SECRET) {
    logger.error('JWT_SECRET is not set; refusing to start in production');
    process.exit(1);
}
let HttpExceptionFilter = class HttpExceptionFilter {
    catch(exception, host) {
        var _a, _b;
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let errors = null;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            if (typeof res === 'string') {
                message = res;
            }
            else if (typeof res === 'object' && res !== null) {
                message = res['message'] || message;
                errors = res['error'] || null;
            }
        }
        else if (exception && typeof exception === 'object' && exception.message) {
            message = exception.message;
        }
        const errorCode = (exception instanceof common_1.HttpException && ((_a = exception.getResponse()) === null || _a === void 0 ? void 0 : _a.code)) || `E${status}`;
        const payload = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
            errors,
            code: errorCode,
            requestId: request.id || ((_b = request.headers) === null || _b === void 0 ? void 0 : _b['x-request-id']) || null,
        };
        logger.error({ exception, path: request.url, requestId: request.id }, message);
        if (process.env.SENTRY_DSN) {
            try {
                Sentry.withScope((scope) => {
                    var _a;
                    try {
                        scope.setTag('requestId', request.id || ((_a = request.headers) === null || _a === void 0 ? void 0 : _a['x-request-id']) || null);
                        scope.setExtra('path', request.url);
                        if (request.user) {
                            try {
                                scope.setUser({ id: request.user.userId, email: request.user.email });
                            }
                            catch (err) {
                            }
                        }
                    }
                    catch (err) {
                    }
                    Sentry.captureException(exception);
                });
            }
            catch (err) {
            }
        }
        response.status(status).json(payload);
    }
};
HttpExceptionFilter = __decorate([
    (0, common_1.Injectable)()
], HttpExceptionFilter);
async function bootstrap() {
    console.log('=== BOOTSTRAP STARTING ===');
    if (process.env.SENTRY_DSN) {
        Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1') });
    }
    console.log('=== Creating NestJS app ===');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    console.log('=== NestJS app created ===');
    const httpAdapter = app.getHttpAdapter();
    const expressInstance = httpAdapter.getInstance();
    expressInstance.get('/metrics', async (req, res) => {
        var _a;
        const metricsToken = process.env.METRICS_TOKEN;
        if (metricsToken) {
            const auth = req.headers['authorization'] || '';
            const provided = auth.startsWith('Bearer ') ? auth.slice(7) : (_a = req.query) === null || _a === void 0 ? void 0 : _a.token;
            if (provided !== metricsToken) {
                res.status(401).end('Unauthorized');
                return;
            }
        }
        try {
            res.set('Content-Type', promClient.register.contentType);
            res.end(await promClient.register.metrics());
        }
        catch (err) {
            res.status(500).end(err === null || err === void 0 ? void 0 : err.message);
        }
    });
    const reqLimit = process.env.REQUEST_SIZE_LIMIT || '100kb';
    app.use(require('express').json({
        limit: reqLimit,
        verify: (req, _res, buf) => {
            if (buf && buf.length) {
                req.rawBody = buf.toString();
            }
        },
    }));
    app.use(require('express').urlencoded({ extended: true, limit: reqLimit }));
    expressInstance.use((req, _res, next) => {
        var _a;
        req.cookies = {};
        const header = (_a = req.headers) === null || _a === void 0 ? void 0 : _a.cookie;
        if (!header)
            return next();
        try {
            header.split(';').forEach((pair) => {
                const idx = pair.indexOf('=');
                if (idx < 0)
                    return;
                const key = pair.substring(0, idx).trim();
                const val = decodeURIComponent(pair.substring(idx + 1).trim());
                req.cookies[key] = val;
            });
        }
        catch (err) {
        }
        return next();
    });
    if (process.env.TRUST_PROXY === '1') {
        try {
            expressInstance.set('trust proxy', 1);
            logger.info('Express trust proxy set to 1');
        }
        catch (err) {
            logger.warn('Failed to set trust proxy', err);
        }
    }
    const corsOrigins = process.env.CORS_ORIGINS;
    if (corsOrigins) {
        const origins = corsOrigins.split(',').map((s) => s.trim());
        app.enableCors({ origin: origins, credentials: true });
        logger.info(`CORS enabled for origins: ${origins.join(',')}`);
    }
    else if (!isProduction) {
        const devOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4200'];
        app.enableCors({ origin: devOrigins, credentials: true });
        logger.info(`CORS enabled for localhost origins in non-production (set CORS_ORIGINS to override)`);
    }
    app.use((0, helmet_1.default)());
    app.use((req, res, next) => {
        next();
    });
    const collectDefaultMetrics = promClient.collectDefaultMetrics;
    collectDefaultMetrics();
    app.use(pino_http_1.default({
        logger,
        genReqId: (req) => req.headers['x-request-id'] || (req.id = (0, crypto_1.randomUUID)()),
        reqCustomProps: (req) => ({ requestId: req.id }),
        autoLogging: false,
    }));
    app.use((req, _res, next) => {
        var _a;
        const id = req.id || ((_a = req.headers) === null || _a === void 0 ? void 0 : _a['x-request-id']) || (0, crypto_1.randomUUID)();
        req.id = id;
        if (process.env.SENTRY_DSN) {
            try {
                Sentry.addBreadcrumb({
                    category: 'request',
                    message: `${req.method} ${req.url}`,
                    level: 'info',
                    data: { requestId: id },
                });
            }
            catch (err) {
            }
        }
        next();
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (validationErrors = []) => {
            const errors = validationErrors.map((ve) => {
                const constraints = ve.constraints || (ve.children && ve.children.length ? ve.children.map((c) => c.constraints).flat() : null);
                return { property: ve.property, constraints: ve.constraints || null };
            });
            return new common_1.BadRequestException({ message: 'Validation failed', error: errors, code: 'E400_VALIDATION' });
        },
    }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new response_transform_interceptor_1.ResponseTransformInterceptor());
    const port = parseInt(process.env.APP_PORT || '3000', 10);
    let bullBoardServerAdapter = null;
    if (!isProduction) {
        try {
            bullBoardServerAdapter = new express_1.ExpressAdapter();
            bullBoardServerAdapter.setBasePath('/queues');
            expressInstance.use('/queues', bullBoardServerAdapter.getRouter());
        }
        catch (err) {
            logger.warn('Bull Board pre-registration failed:', err);
        }
    }
    if (!isProduction) {
        try {
            const config = new swagger_1.DocumentBuilder()
                .setTitle('Hajor API')
                .setDescription('API documentation for Hajor fintech system')
                .setVersion('1.0')
                .addBearerAuth()
                .build();
            const document = swagger_1.SwaggerModule.createDocument(app, config, {
                include: [
                    auth_module_1.AuthModule,
                    users_module_1.UsersModule,
                    wallet_module_1.WalletModule,
                    transactions_module_1.TransactionsModule,
                    groups_module_1.GroupsModule,
                    contributions_module_1.ContributionsModule,
                    payouts_module_1.PayoutsModule,
                    notifications_module_1.NotificationsModule,
                    disputes_module_1.DisputesModule,
                    fraud_module_1.FraudModule,
                    chat_module_1.ChatModule,
                    ticket_module_1.TicketModule,
                    health_module_1.HealthModule,
                ],
            });
            swagger_1.SwaggerModule.setup('api', app, document);
            logger.info('Swagger UI available at /api');
        }
        catch (error) {
            logger.error('Swagger setup failed (continuing without docs):', error);
        }
    }
    else {
        logger.info('Production mode: Swagger UI disabled');
    }
    await app.init();
    if (isProduction) {
        try {
            const throttler = app.get(throttler_1.ThrottlerGuard);
            app.useGlobalGuards(throttler);
            logger.info('Global ThrottlerGuard enabled');
        }
        catch (err) {
            logger.warn('ThrottlerGuard not available or failed to register', err);
        }
    }
    else {
        logger.info('Non-production mode: skipping global ThrottlerGuard');
    }
    if (!isProduction && bullBoardServerAdapter) {
        try {
            const queueService = app.get(queue_service_1.QueueService);
            (0, api_1.createBullBoard)({
                queues: [
                    new bullMQAdapter_1.BullMQAdapter(queueService.paymentsQueue),
                    new bullMQAdapter_1.BullMQAdapter(queueService.payoutsQueue),
                    new bullMQAdapter_1.BullMQAdapter(queueService.notificationsQueue),
                ],
                serverAdapter: bullBoardServerAdapter,
            });
            logger.info('Bull Board available at /queues');
        }
        catch (error) {
            logger.error('Bull Board queue wiring failed:', error);
        }
    }
    await app.listen(port);
    logger.info(`Server listening on port ${port}`);
}
bootstrap().catch((err) => {
    var _a;
    const msg = (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err);
    console.error(`Bootstrap failed: ${msg}`, err);
    logger.error(`Bootstrap failed: ${msg}`, err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map