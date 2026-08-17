import Fastify, { type FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import type { AppConfig } from './config/env.js';
import { AppError } from './shared/errors.js';
import { registerStoryRoutes } from './modules/stories/routes.js';
import { registerAuthRoutes } from './modules/auth/routes.js';
import { registerWriterRoutes } from './modules/stories/writer-routes.js';
import { registerReaderRoutes } from './modules/stories/reader-routes.js';
import { registerAnalyticsRoutes } from './modules/stories/analytics-routes.js';
import { registerModerationRoutes } from './modules/stories/moderation-routes.js';
import { registerMediaRoutes } from './modules/media/routes.js';
import { configureDatabase, probeDatabaseConnection } from './shared/db.js';
import { configureAuth } from './shared/auth.js';
import { contentCache } from './shared/content-cache.js';
import { registerSocialRoutes } from './modules/social/routes.js';
import { registerBulkImportRoutes } from './modules/stories/bulk-import-routes.js';

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  configureDatabase({ fixtureMode: config.READINN_FIXTURE_MODE });
  const jwtSecret = config.JWT_SECRET ?? (config.READINN_FIXTURE_MODE ? 'readinn-fixture-secret-for-tests-only' : undefined);
  configureAuth(jwtSecret ? { jwtSecret } : {});
  contentCache.configure({
    enabled: config.CACHE_ENABLED,
    directory: config.CACHE_DIR,
    ttlSeconds: config.CACHE_TTL_SECONDS,
  });
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
    },
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
    trustProxy: config.TRUSTED_PROXY_IPS,
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: [config.APP_WEB_URL],
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  app.get('/health/live', () => ({ data: { status: 'ok' } }));
  app.get('/health/ready', async (_request, reply) => {
    const isDbConnected = await probeDatabaseConnection();
    if (!isDbConnected) reply.status(503);
    return {
      data: {
        status: isDbConnected ? 'ok' : 'unavailable',
        dependencies: {
          database: isDbConnected ? 'connected' : 'unavailable',
        },
      },
    };
  });

  registerStoryRoutes(app);
  registerAuthRoutes(app);
  registerWriterRoutes(app);
  registerReaderRoutes(app);
  registerAnalyticsRoutes(app);
  registerModerationRoutes(app);
  registerMediaRoutes(app);
  registerSocialRoutes(app);
  registerBulkImportRoutes(app);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          requestId: request.id,
          details: error.details,
        },
      });
    }

    if (error instanceof ZodError) {
      return reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La solicitud no cumple el formato esperado.',
          requestId: request.id,
          details: error.issues,
        },
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return reply.status(409).send({
        error: {
          code: 'RESOURCE_CONFLICT',
          message: 'El recurso ya existe o entra en conflicto con otro cambio.',
          requestId: request.id,
          details: [],
        },
      });
    }

    if (
      error instanceof Prisma.PrismaClientInitializationError
      || error instanceof Prisma.PrismaClientRustPanicError
      || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2024')
    ) {
      return reply.status(503).send({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Servicio temporalmente no disponible.',
          requestId: request.id,
          details: [],
        },
      });
    }

    request.log.error({ err: error }, 'Unhandled request error');
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocurrió un error inesperado.',
        requestId: request.id,
        details: [],
      },
    });
  });

  return app;
}
