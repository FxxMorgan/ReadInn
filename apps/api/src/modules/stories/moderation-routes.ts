import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin, resolveActiveUser } from '../../shared/auth-guards.js';
import { contentCache, storyCacheTags } from '../../shared/content-cache.js';
import { checkDatabaseConnection, prisma } from '../../shared/db.js';
import { AppError } from '../../shared/errors.js';
import { storyIdentifier } from '../../shared/identifiers.js';

const createReportSchema = z.object({
  targetType: z.enum(['story', 'chapter', 'comment']),
  targetId: z.string().trim().min(1).max(160),
  reason: z.enum(['spam', 'copyright', 'inappropriate', 'harassment', 'other']),
  details: z.string().trim().max(1000).optional(),
}).strict();

const reportListSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'dismissed']).default('pending'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const updateStatusSchema = z.object({
  status: z.enum(['published', 'suspended', 'archived', 'draft']),
  reason: z.string().trim().max(500).optional(),
});

interface FixtureReport {
  id: string;
  targetType: 'story' | 'chapter' | 'comment';
  targetId: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: string;
}

const fixtureReports: FixtureReport[] = [];

export function registerModerationRoutes(app: FastifyInstance): void {
  app.post('/v1/reports', {
    config: {
      rateLimit: { max: 5, timeWindow: '10 minutes' },
    },
  }, async (request, reply) => {
    const body = createReportSchema.parse(request.body);
    const reporter = await resolveActiveUser(request);
    if (!(await checkDatabaseConnection())) {
      const report: FixtureReport = {
        id: `report-${crypto.randomUUID()}`,
        targetType: body.targetType,
        targetId: body.targetId,
        reason: body.reason,
        ...(body.details ? { details: body.details } : {}),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      fixtureReports.unshift(report);
      return reply.status(201).send({ data: { success: true, reportId: report.id } });
    }

    const report = await prisma.moderationReport.create({
      data: {
        ...(reporter ? { reporterId: reporter.id } : {}),
        targetType: body.targetType,
        targetId: body.targetId,
        reason: body.reason,
        ...(body.details ? { details: body.details } : {}),
      },
      select: { id: true },
    });
    return reply.status(201).send({ data: { success: true, reportId: report.id } });
  });

  app.get('/v1/admin/reports', async (request) => {
    await requireAdmin(request);
    const query = reportListSchema.parse(request.query);
    const reports = await prisma.moderationReport.findMany({
      where: { status: query.status },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });
    return {
      data: reports.map((report) => ({
        ...report,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
      })),
    };
  });

  app.patch<{ Params: { storyId: string } }>('/v1/admin/stories/:storyId/status', async (request) => {
    await requireAdmin(request);
    const body = updateStatusSchema.parse(request.body);
    const existing = await prisma.story.findFirst({
      where: storyIdentifier(request.params.storyId),
      select: { id: true },
    });
    if (!existing) throw new AppError('STORY_NOT_FOUND', 'No se encontro la obra.', 404);

    const story = await prisma.story.update({
      where: { id: existing.id },
      data: {
        status: body.status,
        ...(body.status === 'archived' ? { archivedAt: new Date() } : { archivedAt: null }),
      },
      select: { id: true, status: true, updatedAt: true },
    });
    await contentCache.invalidateTags(storyCacheTags(story.id));
    return {
      data: {
        storyId: story.id,
        status: story.status,
        updatedAt: story.updatedAt.toISOString(),
      },
    };
  });
}
