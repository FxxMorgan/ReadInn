import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../shared/errors.js';
import { storyRepository } from './story-repository.js';

const listQuerySchema = z.object({
  query: z.string().trim().max(100).optional(),
  genre: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export function registerStoryRoutes(app: FastifyInstance): void {
  app.get('/v1/stories', async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    reply.header('Cache-Control', 'public, max-age=0, must-revalidate');
    return storyRepository.getStories(query);
  });

  app.get<{ Params: { storyId: string } }>('/v1/stories/:storyId', async (request, reply) => {
    const story = await storyRepository.getStoryById(request.params.storyId);
    if (!story) {
      throw new AppError('STORY_NOT_FOUND', 'No se encontró la obra.', 404);
    }
    reply.header('Cache-Control', 'public, max-age=0, must-revalidate');
    return { data: story };
  });

  app.get<{ Params: { storyId: string; chapterId: string } }>(
    '/v1/stories/:storyId/chapters/:chapterId',
    async (request, reply) => {
      const chapter = await storyRepository.getChapterById(
        request.params.storyId,
        request.params.chapterId
      );
      if (!chapter) {
        throw new AppError('CHAPTER_NOT_FOUND', 'No se encontró el capítulo.', 404);
      }
      reply.header('Cache-Control', 'public, max-age=0, must-revalidate');
      return { data: chapter };
    }
  );

  app.get<{ Params: { storyId: string; chapterId: string } }>(
    '/v1/stories/:storyId/chapters/:chapterId/download',
    async (request, reply) => {
      const chapter = await storyRepository.getChapterById(
        request.params.storyId,
        request.params.chapterId,
      );
      if (!chapter) {
        throw new AppError('CHAPTER_NOT_FOUND', 'No se encontro el capitulo.', 404);
      }
      const content = Array.isArray(chapter.content)
        ? chapter.content.map(String)
        : [String(chapter.content ?? '')];
      const safeTitle = chapter.title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .toLowerCase() || 'capitulo';
      const markdown = `# ${chapter.title}\n\n${content.join('\n\n')}\n`;
      return reply
        .header('Content-Type', 'text/markdown; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${safeTitle}.md"`)
        .header('Cache-Control', 'public, max-age=0, must-revalidate')
        .send(markdown);
    },
  );
}
