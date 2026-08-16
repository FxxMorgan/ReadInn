import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { bearerClaims } from '../../shared/auth.js';
import { contentCache, storyCacheTags } from '../../shared/content-cache.js';
import { checkDatabaseConnection } from '../../shared/db.js';
import { writerRepository } from './writer-repository.js';

const createStorySchema = z.object({
  title: z.string().min(2).max(150),
  synopsis: z.string().min(10).max(3000),
  genre: z.string().min(2).max(80),
  isMature: z.boolean().optional(),
  coverColor: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
});
const editorContentSchema = z.union([z.array(z.string()), z.record(z.unknown()), z.string()]);
const createChapterSchema = z.object({
  title: z.string().min(2).max(150),
  content: editorContentSchema,
  status: z.enum(['draft', 'published']).optional(),
});
const updateChapterSchema = z.object({
  title: z.string().min(2).max(150),
  content: editorContentSchema,
  plainText: z.string(),
  expectedVersion: z.number().int().min(1),
});

function resolveUserId(request: FastifyRequest): string | null {
  return bearerClaims(request.headers.authorization)?.userId ?? null;
}

async function requireAuthor(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const userId = resolveUserId(request);
  if (userId) return userId;
  if (!(await checkDatabaseConnection())) return 'guest';
  await reply.status(401).send({
    error: { code: 'AUTH_REQUIRED', message: 'Inicia sesion para gestionar tus obras.' },
  });
  return null;
}

async function invalidateStory(storyId: string, chapterId?: string): Promise<void> {
  await contentCache.invalidateTags(storyCacheTags(storyId, chapterId));
}

export function registerWriterRoutes(app: FastifyInstance): void {
  app.get('/v1/me/stories', async (request) => {
    const authorId = resolveUserId(request);
    if (!authorId) return { data: [] };
    const includeArchived = (request.query as { includeArchived?: string })?.includeArchived === 'true';
    return { data: await writerRepository.getUserStories(authorId, includeArchived) };
  });

  app.get<{ Params: { storyId: string } }>('/v1/me/stories/:storyId', async (request, reply) => {
    const authorId = await requireAuthor(request, reply);
    if (!authorId) return;
    const story = await writerRepository.getUserStory(authorId, request.params.storyId);
    if (!story) {
      return reply.status(404).send({
        error: { code: 'STORY_NOT_FOUND', message: 'No se encontro la obra.' },
      });
    }
    return { data: story };
  });

  app.post('/v1/stories', async (request, reply) => {
    const body = createStorySchema.parse(request.body);
    const authorId = await requireAuthor(request, reply);
    if (!authorId) return;
    const story = await writerRepository.createStory({
      authorId,
      title: body.title,
      synopsis: body.synopsis,
      genre: body.genre,
      ...(body.isMature !== undefined ? { isMature: body.isMature } : {}),
      ...(body.coverColor !== undefined ? { coverColor: body.coverColor } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    });
    await invalidateStory(story.id);
    return reply.status(201).send({ data: story });
  });

  app.post<{ Params: { storyId: string } }>('/v1/stories/:storyId/chapters', async (request, reply) => {
    const body = createChapterSchema.parse(request.body);
    const authorId = await requireAuthor(request, reply);
    if (!authorId) return;
    const story = await writerRepository.getUserStory(authorId, request.params.storyId);
    if (!story) {
      return reply.status(404).send({
        error: { code: 'STORY_NOT_FOUND', message: 'No se encontro la obra.' },
      });
    }
    const chapter = await writerRepository.createChapter({
      storyId: request.params.storyId,
      title: body.title,
      content: body.content,
      ...(body.status !== undefined ? { status: body.status } : {}),
    });
    await invalidateStory(request.params.storyId, chapter.id);
    return reply.status(201).send({ data: chapter });
  });

  app.get<{ Params: { storyId: string; chapterId: string } }>(
    '/v1/me/stories/:storyId/chapters/:chapterId',
    async (request, reply) => {
      const authorId = await requireAuthor(request, reply);
      if (!authorId) return;
      const chapter = await writerRepository.getChapter(
        authorId,
        request.params.storyId,
        request.params.chapterId,
      );
      if (!chapter) {
        return reply.status(404).send({
          error: { code: 'CHAPTER_NOT_FOUND', message: 'No se encontro el capitulo.' },
        });
      }
      return { data: chapter };
    },
  );

  app.patch<{ Params: { storyId: string; chapterId: string } }>(
    '/v1/me/stories/:storyId/chapters/:chapterId',
    async (request, reply) => {
      const body = updateChapterSchema.parse(request.body);
      const authorId = await requireAuthor(request, reply);
      if (!authorId) return;
      const result = await writerRepository.updateChapter({
        authorId,
        chapterId: request.params.chapterId,
        title: body.title,
        content: body.content,
        plainText: body.plainText,
        expectedVersion: body.expectedVersion,
      });
      if (!result) {
        return reply.status(404).send({
          error: { code: 'CHAPTER_NOT_FOUND', message: 'No se encontro el capitulo.' },
        });
      }
      if ('conflict' in result && result.conflict) {
        return reply.status(409).send({
          error: {
            code: 'VERSION_CONFLICT',
            message: 'El capitulo cambio en otra ventana.',
            details: [result.currentVersion],
          },
        });
      }
      await invalidateStory(request.params.storyId, request.params.chapterId);
      return { data: result };
    },
  );

  app.delete<{ Params: { storyId: string; chapterId: string } }>(
    '/v1/me/stories/:storyId/chapters/:chapterId',
    async (request, reply) => {
      const authorId = await requireAuthor(request, reply);
      if (!authorId) return;
      const result = await writerRepository.deleteChapter(
        authorId,
        request.params.storyId,
        request.params.chapterId,
      );
      if (!result) {
        return reply.status(404).send({
          error: { code: 'CHAPTER_NOT_FOUND', message: 'No se encontro el capitulo.' },
        });
      }
      await invalidateStory(request.params.storyId, request.params.chapterId);
      return { data: result };
    },
  );

  app.post<{ Params: { storyId: string; chapterId: string } }>(
    '/v1/me/stories/:storyId/chapters/:chapterId/publish',
    async (request, reply) => {
      const authorId = await requireAuthor(request, reply);
      if (!authorId) return;
      const result = await writerRepository.publishChapter(authorId, request.params.chapterId);
      if (!result) {
        return reply.status(404).send({
          error: { code: 'CHAPTER_NOT_FOUND', message: 'No se encontro el capitulo.' },
        });
      }
      await invalidateStory(request.params.storyId, request.params.chapterId);
      return { data: result };
    },
  );

  app.get<{ Params: { storyId: string; chapterId: string } }>(
    '/v1/me/stories/:storyId/chapters/:chapterId/revisions',
    async (request, reply) => {
      const authorId = await requireAuthor(request, reply);
      if (!authorId) return;
      return { data: await writerRepository.revisions(authorId, request.params.chapterId) };
    },
  );

  app.post<{ Params: { storyId: string; chapterId: string; revisionId: string } }>(
    '/v1/me/stories/:storyId/chapters/:chapterId/revisions/:revisionId/restore',
    async (request, reply) => {
      const authorId = await requireAuthor(request, reply);
      if (!authorId) return;
      const result = await writerRepository.restoreRevision(
        authorId,
        request.params.chapterId,
        request.params.revisionId,
      );
      if (!result) {
        return reply.status(404).send({
          error: { code: 'REVISION_NOT_FOUND', message: 'No se encontro la version.' },
        });
      }
      await invalidateStory(request.params.storyId, request.params.chapterId);
      return { data: result };
    },
  );

  app.post<{ Params: { storyId: string } }>('/v1/me/stories/:storyId/publish', async (request, reply) => {
    const authorId = await requireAuthor(request, reply);
    if (!authorId) return;
    const result = await writerRepository.publishStory(authorId, request.params.storyId);
    if (!result) {
      return reply.status(404).send({
        error: { code: 'STORY_NOT_FOUND', message: 'No se encontro la obra.' },
      });
    }
    await invalidateStory(request.params.storyId);
    return { data: result };
  });

  app.delete<{ Params: { storyId: string } }>('/v1/me/stories/:storyId', async (request, reply) => {
    const authorId = await requireAuthor(request, reply);
    if (!authorId) return;
    const result = await writerRepository.archiveStory(authorId, request.params.storyId);
    if (!result) {
      return reply.status(404).send({
        error: { code: 'STORY_NOT_FOUND', message: 'No se encontro la obra.' },
      });
    }
    await invalidateStory(request.params.storyId);
    return { data: result };
  });

  app.post<{ Params: { storyId: string } }>('/v1/me/stories/:storyId/restore', async (request, reply) => {
    const authorId = await requireAuthor(request, reply);
    if (!authorId) return;
    const result = await writerRepository.restoreStory(authorId, request.params.storyId);
    if (!result) {
      return reply.status(404).send({
        error: { code: 'STORY_NOT_FOUND', message: 'No se encontro la obra.' },
      });
    }
    await invalidateStory(request.params.storyId);
    return { data: result };
  });
}
