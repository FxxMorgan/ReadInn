import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
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
import { checkDatabaseConnection } from './shared/db.js';

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
    },
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: '*',
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  app.get('/health/live', () => ({ data: { status: 'ok' } }));
  app.get('/health/ready', async () => {
    const isDbConnected = await checkDatabaseConnection();
    return {
      data: {
        status: 'ok',
        dependencies: {
          database: isDbConnected ? 'connected' : 'fixture_fallback',
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
