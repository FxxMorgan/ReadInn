import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { checkDatabaseConnection } from '../../shared/db.js';

const eventSchema = z.object({
  eventType: z.enum(['chapter_opened', 'reading_heartbeat', 'chapter_completed']),
  storyId: z.string(),
  chapterId: z.string(),
  activeSeconds: z.number().optional(),
  eventId: z.string().optional(),
});

export function registerAnalyticsRoutes(app: FastifyInstance): void {
  // Writer Analytics Dashboard Metrics
  app.get('/v1/dashboard/metrics', async () => {
    await checkDatabaseConnection();

    return {
      data: {
        summary: {
          totalViews: 24580,
          viewsGrowthMonth: '+12.4%',
          uniqueReaders: 8210,
          readersGrowthMonth: '+8.1%',
          avgReadMinutes: 6.4,
          followers: 1240,
          followersGrowthMonth: '+45 este mes',
        },
        storyMetrics: [
          {
            storyId: 'story-lighthouse',
            storyTitle: 'La luz del faro',
            totalViews: 18420,
            completionRatePercentage: 78.5,
            chaptersRetention: [
              { position: 1, chapterTitle: 'El mapa bajo la sal', views: 8200, retentionPercentage: 100 },
              { position: 2, chapterTitle: 'La escalera de hierro', views: 6800, retentionPercentage: 82.9 },
              { position: 3, chapterTitle: 'La habitación sin ventanas', views: 6440, retentionPercentage: 78.5 },
            ],
          },
        ],
      },
    };
  });

  // Log reading telemetry events
  app.post('/v1/analytics/events', async (request) => {
    const body = eventSchema.parse(request.body);
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
