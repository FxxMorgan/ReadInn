import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { checkDatabaseConnection } from '../../shared/db.js';
import { writerRepository } from './writer-repository.js';

const createStorySchema = z.object({
  title: z.string().min(2).max(150),
  synopsis: z.string().min(10).max(3000),
  genre: z.string().min(2).max(80),
  isMature: z.boolean().optional(),
  coverColor: z.string().optional(),
});

const createChapterSchema = z.object({
  title: z.string().min(2).max(150),
  content: z.array(z.string()).min(1),
});

export function registerWriterRoutes(app: FastifyInstance): void {
  const resolveAuthorId = async (request: { headers: { authorization?: unknown } }): Promise<string | null> => {
    const authorization = request.headers.authorization;
    const token = typeof authorization === 'string'
      ? authorization.replace(/^Bearer\s+/i, '')
      : undefined;
    if (token) {
      try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as { userId?: string };
        if (payload.userId) return payload.userId;
      } catch (_) {
        // Fall through to the fixture-safe fallback.
      }
    }
    if (!(await checkDatabaseConnection())) return token ? `token:${token}` : 'guest';
    return null;
  };

  // Get author's stories
  app.get('/v1/me/stories', async (request) => {
    const defaultAuthorId = await resolveAuthorId(request);
    if (!defaultAuthorId) return { data: [] };
    const stories = await writerRepository.getUserStories(defaultAuthorId);
    return { data: stories };
  });

  // Create new story
  app.post('/v1/stories', async (request, reply) => {
    const body = createStorySchema.parse(request.body);
    const defaultAuthorId = await resolveAuthorId(request);
    if (!defaultAuthorId) return reply.status(401).send({ error: { code: 'AUTH_REQUIRED', message: 'Inicia sesion para crear una obra.' } });

    const story = await writerRepository.createStory({
      authorId: defaultAuthorId,
      title: body.title,
      synopsis: body.synopsis,
      genre: body.genre,
      isMature: body.isMature,
      coverColor: body.coverColor,
    });

    return reply.status(201).send({ data: story });
  });

  // Create chapter
  app.post<{ Params: { storyId: string } }>(
    '/v1/stories/:storyId/chapters',
    async (request, reply) => {
      const body = createChapterSchema.parse(request.body);
      const chapter = await writerRepository.createChapter({
        storyId: request.params.storyId,
        title: body.title,
        content: body.content,
      });

      return reply.status(201).send({ data: chapter });
    }
  );
}
