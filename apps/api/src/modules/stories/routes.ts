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
  app.get('/v1/stories', async (request) => {
    const query = listQuerySchema.parse(request.query);
    return storyRepository.getStories(query);
  });

  app.get<{ Params: { storyId: string } }>('/v1/stories/:storyId', async (request) => {
    const story = await storyRepository.getStoryById(request.params.storyId);
    if (!story) {
      throw new AppError('STORY_NOT_FOUND', 'No se encontró la obra.', 404);
    }
    return { data: story };
  });

  app.get<{ Params: { storyId: string; chapterId: string } }>(
    '/v1/stories/:storyId/chapters/:chapterId',
    async (request) => {
      const chapter = await storyRepository.getChapterById(
        request.params.storyId,
        request.params.chapterId
      );
      if (!chapter) {
        throw new AppError('CHAPTER_NOT_FOUND', 'No se encontró el capítulo.', 404);
      }
      return { data: chapter };
    }
  );
}
