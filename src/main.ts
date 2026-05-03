import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, Injectable, ArgumentsHost, BadRequestException, HttpException, HttpStatus, ExceptionFilter } from '@nestjs/common';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { AppModule } from './app.module';
import pino from 'pino';
import pinoHttp from 'pino-http';
// (common imports consolidated above)
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import * as promClient from 'prom-client';
import { randomUUID } from 'crypto';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter as BullBoardExpressAdapter } from '@bull-board/express';
import { HealthModule } from './health/health.module';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ContributionsModule } from './modules/contributions/contributions.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { GroupsModule } from './modules/groups/groups.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ChatModule } from './modules/chat/chat.module';
import { TicketModule } from './modules/tickets/ticket.module';
import { QueueService } from './infrastructure/queue/queue.service';

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      }
    : undefined,
});

// enforce JWT secret in production
if (isProduction && !process.env.JWT_SECRET) {
  logger.error('JWT_SECRET is not set; refusing to start in production');
  process.exit(1);
}

@Injectable()
class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        // @ts-ignore
        message = res['message'] || message;
        // @ts-ignore
        errors = res['error'] || null;
      }
    } else if (exception && typeof exception === 'object' && (exception as any).message) {
      // @ts-ignore
      message = (exception as any).message;
    }

    // structured error code mapping
    const errorCode = (exception instanceof HttpException && (exception.getResponse() as any)?.code) || `E${status}`;

    const payload = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      errors,
      code: errorCode,
      requestId: request.id || request.headers?.['x-request-id'] || null,
    };

    logger.error({ exception, path: request.url, requestId: request.id }, message);

    // capture to Sentry if configured and include request context
    if (process.env.SENTRY_DSN) {
      try {
        Sentry.withScope((scope) => {
          try {
            scope.setTag('requestId', request.id || request.headers?.['x-request-id'] || null);
            scope.setExtra('path', request.url);
            if (request.user) {
              try {
                scope.setUser({ id: request.user.userId, email: request.user.email });
              } catch (err) {
                // ignore user set errors
              }
            }
          } catch (err) {
            // ignore scope population errors
          }
          Sentry.captureException(exception);
        });
      } catch (err) {
        // ignore
      }
    }

    response.status(status).json(payload);
  }
}

async function bootstrap() {
  console.log('=== BOOTSTRAP STARTING ===');
  // initialize Sentry early
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1') });
  }
  console.log('=== Creating NestJS app ===');
  const app = await NestFactory.create(AppModule); // Enable default logger temporarily
  console.log('=== NestJS app created ===');

  // add middleware to expose /metrics
  const httpAdapter = app.getHttpAdapter();
  const expressInstance = httpAdapter.getInstance();

  expressInstance.get('/metrics', async (req: any, res: any) => {
    const metricsToken = process.env.METRICS_TOKEN;
    if (metricsToken) {
      const auth = req.headers['authorization'] || '';
      const provided = auth.startsWith('Bearer ') ? auth.slice(7) : (req.query?.token as string | undefined);
      if (provided !== metricsToken) {
        res.status(401).end('Unauthorized');
        return;
      }
    }
    try {
      res.set('Content-Type', promClient.register.contentType);
      res.end(await promClient.register.metrics());
    } catch (err) {
      res.status(500).end(err?.message);
    }
  });

  const reqLimit = process.env.REQUEST_SIZE_LIMIT || '100kb';
  
  // Setup body parser with raw body capture for webhook signature verification
  // Apply this AFTER other middleware setup but BEFORE routes
  app.use(require('express').json({
    limit: reqLimit,
    verify: (req: any, _res: any, buf: Buffer) => {
      if (buf && buf.length) {
        req.rawBody = buf.toString();
      }
    },
  }));
  app.use(require('express').urlencoded({ extended: true, limit: reqLimit }));

  // lightweight cookie parser (avoids adding cookie-parser dependency)
  expressInstance.use((req: any, _res: any, next: any) => {
    req.cookies = {};
    const header = req.headers?.cookie;
    if (!header) return next();
    try {
      header.split(';').forEach((pair: string) => {
        const idx = pair.indexOf('=');
        if (idx < 0) return;
        const key = pair.substring(0, idx).trim();
        const val = decodeURIComponent(pair.substring(idx + 1).trim());
        req.cookies[key] = val;
      });
    } catch (err) {
      // ignore cookie parse errors
    }
    return next();
  });

  // trust proxy (enable when behind a reverse proxy/load balancer)
  if (process.env.TRUST_PROXY === '1') {
    try {
      expressInstance.set('trust proxy', 1);
      logger.info('Express trust proxy set to 1');
    } catch (err) {
      logger.warn('Failed to set trust proxy', err);
    }
  }

  // CORS configuration driven by env var `CORS_ORIGINS` (comma-separated).
  // In non-production, defaults to localhost origins if CORS_ORIGINS is not set.
  const corsOrigins = process.env.CORS_ORIGINS;
  if (corsOrigins) {
    const origins = corsOrigins.split(',').map((s) => s.trim());
    app.enableCors({ origin: origins, credentials: true });
    logger.info(`CORS enabled for origins: ${origins.join(',')}`);
  } else if (!isProduction) {
    const devOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4200'];
    app.enableCors({ origin: devOrigins, credentials: true });
    logger.info(`CORS enabled for localhost origins in non-production (set CORS_ORIGINS to override)`);
  }

  // security headers
  app.use(helmet());

  // body parser size limit
  app.use((req, res, next) => {
    // express will parse JSON automatically; limit can be enforced via middleware if needed
    next();
  });

  // setup Prometheus metrics
  const collectDefaultMetrics = promClient.collectDefaultMetrics;
  collectDefaultMetrics();
  

  // pino-http with correlation ID generation
  // disable pino-http auto logging of each request to avoid verbose "request completed" entries
  app.use((pinoHttp as any)({
    logger,
    genReqId: (req: any) => req.headers['x-request-id'] || (req.id = randomUUID()),
    reqCustomProps: (req: any) => ({ requestId: req.id }),
    autoLogging: false,
  }));

  // add a small middleware to record a Sentry breadcrumb per request and ensure request id exists
  app.use((req: any, _res: any, next: any) => {
    const id = req.id || req.headers?.['x-request-id'] || randomUUID();
    req.id = id;
    if (process.env.SENTRY_DSN) {
      try {
        Sentry.addBreadcrumb({
          category: 'request',
          message: `${req.method} ${req.url}`,
          level: 'info',
          data: { requestId: id },
        });
      } catch (err) {
        // ignore breadcrumb failures
      }
    }
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (validationErrors = []) => {
        // flatten class-validator ValidationError[] into a list of { property, constraints }
        const errors = (validationErrors as any[]).map((ve) => {
          const constraints = ve.constraints || (ve.children && ve.children.length ? ve.children.map((c: any) => c.constraints).flat() : null);
          return { property: ve.property, constraints: ve.constraints || null };
        });
        return new BadRequestException({ message: 'Validation failed', error: errors, code: 'E400_VALIDATION' });
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // wrap successful responses into a standard shape
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  const port = parseInt(process.env.APP_PORT || '3000', 10);

  // Bull Board – register the Express middleware NOW (before app.init) so it sits
  // ahead of NestJS's router in the Express stack. NestJS would otherwise intercept
  // /queues with a 404 if the middleware were added after init. Queues are wired below.
  // Configurable via ENABLE_BULL_BOARD env var (defaults to enabled in non-production)
  const enableBullBoard = process.env.ENABLE_BULL_BOARD !== 'false' && (!isProduction || process.env.ENABLE_BULL_BOARD === 'true');
  let bullBoardServerAdapter: InstanceType<typeof BullBoardExpressAdapter> | null = null;
  if (enableBullBoard) {
    try {
      bullBoardServerAdapter = new BullBoardExpressAdapter();
      bullBoardServerAdapter.setBasePath('/queues');
      expressInstance.use('/queues', bullBoardServerAdapter.getRouter());
      logger.info('Bull Board queue dashboard will be available at /queues');
    } catch (err) {
      logger.warn('Bull Board pre-registration failed:', err);
    }
  } else {
    logger.info('Bull Board disabled (set ENABLE_BULL_BOARD=true to enable)');
  }

  // Swagger setup – must be registered on Express BEFORE app.init() so its routes
  // land ahead of NestJS's router in the middleware stack. If added after init,
  // NestJS intercepts /api with a 404 before Swagger can handle it.
  // Configurable via ENABLE_SWAGGER env var (defaults to enabled in non-production)
  const enableSwagger = process.env.ENABLE_SWAGGER !== 'false' && (!isProduction || process.env.ENABLE_SWAGGER === 'true');
  if (enableSwagger) {
    try {
      const config = new DocumentBuilder()
        .setTitle('Hajor API')
        .setDescription('API documentation for Hajor fintech system')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(app, config, {
        include: [
          AuthModule,
          UsersModule,
          WalletModule,
          TransactionsModule,
          GroupsModule,
          ContributionsModule,
          PayoutsModule,
          NotificationsModule,
          DisputesModule,
          FraudModule,
          ChatModule,
          TicketModule,
          HealthModule,
        ],
      });
      SwaggerModule.setup('api', app, document);
      logger.info('Swagger UI available at /api');
    } catch (error) {
      logger.error('Swagger setup failed (continuing without docs):', error);
    }
  } else {
    logger.info('Swagger UI disabled (set ENABLE_SWAGGER=true to enable)');
  }

  // Explicitly initialize the app so that all onModuleInit lifecycle hooks
  // (e.g. QueueService queue creation) have run before we try to access them.
  await app.init();

  // register global throttler guard only in production (skip during development/testing)
  if (isProduction) {
    try {
      const throttler = app.get(ThrottlerGuard);
      app.useGlobalGuards(throttler as any);
      logger.info('Global ThrottlerGuard enabled');
    } catch (err) {
      logger.warn('ThrottlerGuard not available or failed to register', err);
    }
  } else {
    logger.info('Non-production mode: skipping global ThrottlerGuard');
  }

  // Bull Board – wire up the queues now that QueueService is initialized
  if (enableBullBoard && bullBoardServerAdapter) {
    try {
      const queueService = app.get(QueueService);
      createBullBoard({
        queues: [
          new BullMQAdapter(queueService.paymentsQueue),
          new BullMQAdapter(queueService.payoutsQueue),
          new BullMQAdapter(queueService.notificationsQueue),
        ],
        serverAdapter: bullBoardServerAdapter,
      });
      logger.info('Bull Board available at /queues');
    } catch (error) {
      logger.error('Bull Board queue wiring failed:', error);
    }
  }

  await app.listen(port);
  logger.info(`Server listening on port ${port}`);
}

bootstrap().catch((err) => {
  const msg = err?.message ?? String(err);
  console.error(`Bootstrap failed: ${msg}`, err);
  logger.error(`Bootstrap failed: ${msg}`, err);
  process.exit(1);
});
