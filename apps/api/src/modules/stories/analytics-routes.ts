import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { bearerClaims } from '../../shared/auth.js';
import { checkDatabaseConnection, prisma } from '../../shared/db.js';
import { writerRepository } from './writer-repository.js';

const eventSchema = z.object({
  eventType: z.enum(['chapter_opened', 'reading_heartbeat', 'chapter_completed']),
  storyId: z.string().uuid(),
  chapterId: z.string().uuid(),
  activeSeconds: z.number().int().min(0).max(3600).optional(),
  eventId: z.string().min(8).max(120).optional(),
});

function bearerUserId(authorization?: unknown): string | null {
  return bearerClaims(authorization)?.userId ?? null;
}

function anonymousReaderKey(request: {
  ip: string;
  headers: { authorization?: unknown; 'user-agent'?: unknown };
}): string {
  const userId = bearerUserId(request.headers.authorization);
  if (userId) return `user:${userId}`;
  const userAgent = typeof request.headers['user-agent'] === 'string'
    ? request.headers['user-agent']
    : 'unknown';
  const salt = process.env['JWT_SECRET'] ?? 'readinn-anonymous-reader';
  const digest = crypto
    .createHmac('sha256', salt)
    .update(`${request.ip}|${userAgent}`)
    .digest('hex')
    .slice(0, 40);
  return `anon:${digest}`;
}

function emptySummary(storyMetrics: Array<Record<string, unknown>> = []) {
  return {
    data: {
      summary: {
        totalViews: 0,
        viewsGrowthMonth: '0%',
        uniqueReaders: 0,
        readersGrowthMonth: '0%',
        avgReadMinutes: 0,
        followers: 0,
        followersGrowthMonth: '0 este mes',
      },
      storyMetrics,
    },
  };
}

export function registerAnalyticsRoutes(app: FastifyInstance): void {
  app.get('/v1/dashboard/metrics', async (request) => {
    const userId = bearerUserId(request.headers.authorization);
    if (!userId) return emptySummary();

    if (!(await checkDatabaseConnection())) {
      const stories = await writerRepository.getUserStories(userId);
      return emptySummary(
        stories.map((story) => ({
          storyId: story.id,
          storyTitle: story.title,
          totalViews: 0,
          completionRatePercentage: 0,
          chaptersRetention: [],
        })),
      );
    }

    const stories = await prisma.story.findMany({
      where: { authorId: userId, status: { in: ['published', 'completed'] } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true },
    });
    const storyIds = stories.map((story) => story.id);
    if (!storyIds.length) return emptySummary();

    const [viewGroups, uniqueRows, activeGroups, completedRows] = await Promise.all([
      prisma.readingEvent.groupBy({
        by: ['storyId'],
        where: { storyId: { in: storyIds }, eventType: 'chapter_opened' },
        _count: { _all: true },
      }),
      prisma.readingEvent.findMany({
        where: { storyId: { in: storyIds }, eventType: 'chapter_opened' },
        distinct: ['storyId', 'readerKey'],
        select: { storyId: true, readerKey: true },
      }),
      prisma.readingEvent.groupBy({
        by: ['storyId'],
        where: { storyId: { in: storyIds }, eventType: 'reading_heartbeat' },
        _sum: { activeSeconds: true },
      }),
      prisma.readingEvent.findMany({
        where: { storyId: { in: storyIds }, eventType: 'chapter_completed' },
        distinct: ['storyId', 'readerKey'],
        select: { storyId: true, readerKey: true },
      }),
    ]);

    const viewsByStory = new Map(
      viewGroups.map((group) => [group.storyId, group._count._all]),
    );
    const activeSecondsByStory = new Map(
      activeGroups.map((group) => [group.storyId, group._sum.activeSeconds ?? 0]),
    );
    const readersByStory = new Map<string, Set<string>>();
    for (const row of uniqueRows) {
      const readers = readersByStory.get(row.storyId) ?? new Set<string>();
      readers.add(row.readerKey);
      readersByStory.set(row.storyId, readers);
    }
    const completedByStory = new Map<string, Set<string>>();
    for (const row of completedRows) {
      const readers = completedByStory.get(row.storyId) ?? new Set<string>();
      readers.add(row.readerKey);
      completedByStory.set(row.storyId, readers);
    }

    const storyMetrics = stories.map((story) => {
      const readers = readersByStory.get(story.id)?.size ?? 0;
      const completed = completedByStory.get(story.id)?.size ?? 0;
      return {
        storyId: story.id,
        storyTitle: story.title,
        totalViews: viewsByStory.get(story.id) ?? 0,
        completionRatePercentage: readers ? (completed / readers) * 100 : 0,
        chaptersRetention: [],
      };
    });
    const uniqueReaders = new Set(uniqueRows.map((row) => row.readerKey)).size;
    const totalViews = storyMetrics.reduce((sum, item) => sum + item.totalViews, 0);
    const totalActiveSeconds = [...activeSecondsByStory.values()].reduce(
      (sum, seconds) => sum + seconds,
      0,
    );

    return {
      data: {
        summary: {
          totalViews,
          viewsGrowthMonth: '0%',
          uniqueReaders,
          readersGrowthMonth: '0%',
          avgReadMinutes: uniqueReaders ? totalActiveSeconds / uniqueReaders / 60 : 0,
          followers: 0,
          followersGrowthMonth: '0 este mes',
        },
        storyMetrics,
      },
    };
  });

  app.post('/v1/analytics/events', async (request, reply) => {
    const body = eventSchema.parse(request.body);
    if (!(await checkDatabaseConnection())) {
      return { data: { recorded: false, reason: 'database_unavailable' } };
    }

    const chapter = await prisma.chapter.findFirst({
      where: {
        id: body.chapterId,
        storyId: body.storyId,
        status: 'published',
        story: { status: { in: ['published', 'completed'] } },
      },
      select: { id: true },
    });
    if (!chapter) {
      return reply.status(404).send({
        error: {
          code: 'CHAPTER_NOT_FOUND',
          message: 'No se encontro el capitulo publicado.',
        },
      });
    }

    const eventId = body.eventId ?? crypto.randomUUID();
    await prisma.readingEvent.upsert({
      where: { eventId },
      create: {
        eventId,
        storyId: body.storyId,
        chapterId: body.chapterId,
        readerKey: anonymousReaderKey(request),
        eventType: body.eventType,
        activeSeconds: body.activeSeconds ?? 0,
      },
      update: {},
    });

    return {
      data: {
        recorded: true,
        eventType: body.eventType,
        storyId: body.storyId,
        chapterId: body.chapterId,
        timestamp: new Date().toISOString(),
      },
    };
  });
}
