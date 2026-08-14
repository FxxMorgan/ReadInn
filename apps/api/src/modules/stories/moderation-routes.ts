import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const createReportSchema = z.object({
  targetType: z.enum(['story', 'chapter', 'comment']),
  targetId: z.string(),
  reason: z.enum(['spam', 'copyright', 'inappropriate', 'harassment', 'other']),
  details: z.string().max(1000).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['published', 'suspended', 'archived', 'draft']),
  reason: z.string().optional(),
});

interface ReportItem {
  id: string;
  targetType: 'story' | 'chapter' | 'comment';
  targetId: string;
  reason: string;
  details?: string | undefined;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: string;
}

const mockReportsQueue: ReportItem[] = [];

export function registerModerationRoutes(app: FastifyInstance): void {
  // Create moderation report
  app.post('/v1/reports', async (request, reply) => {
    const body = createReportSchema.parse(request.body);
    const newReport: ReportItem = {
      id: `report-${Date.now()}`,
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason,
      details: body.details,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    mockReportsQueue.unshift(newReport);

    return reply.status(201).send({
      data: {
        success: true,
        reportId: newReport.id,
        message: 'Reporte recibido. Nuestro equipo de moderación lo revisará a la brevedad.',
      },
    });
  });

  // Get admin moderation queue
  app.get('/v1/admin/reports', async () => {
    return { data: mockReportsQueue };
  });

  // Admin suspend or restore story status
  app.patch<{ Params: { storyId: string } }>(
    '/v1/admin/stories/:storyId/status',
    async (request) => {
      const { storyId } = request.params;
      const body = updateStatusSchema.parse(request.body);

      return {
        data: {
          storyId,
          status: body.status,
          updatedAt: new Date().toISOString(),
        },
      };
    }
  );
}
