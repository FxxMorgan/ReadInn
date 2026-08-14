import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { checkDatabaseConnection, prisma } from '../../shared/db.js';
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
  const resolveAuthorId = async () => {
    if (!(await checkDatabaseConnection())) return 'user-marina-1';
    const author = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    return author?.id ?? 'user-marina-1';
  };

  // Get author's stories
  app.get('/v1/me/stories', async () => {
    const defaultAuthorId = await resolveAuthorId();
    const stories = await writerRepository.getUserStories(defaultAuthorId);
    return { data: stories };
  });

  // Create new story
  app.post('/v1/stories', async (request, reply) => {
    const body = createStorySchema.parse(request.body);
    const defaultAuthorId = await resolveAuthorId();

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
