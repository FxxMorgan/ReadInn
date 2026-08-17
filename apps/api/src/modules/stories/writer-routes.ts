import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { bearerClaims } from '../../shared/auth.js';
import { contentCache, storyCacheTags } from '../../shared/content-cache.js';
import { checkDatabaseConnection, prisma } from '../../shared/db.js';
import { writerRepository } from './writer-repository.js';

const createStorySchema = z.object({
  title: z.string().min(2).max(150),
  synopsis: z.string().min(10).max(3000),
  genre: z.string().min(2).max(80).optional(),
  genres: z.array(z.string().trim().min(2).max(80)).min(1).max(5).optional(),
  tags: z.array(z.string().trim().min(2).max(100)).max(20).default([]),
  isMature: z.boolean().optional(),
  ageRating: z.enum(['all', '11', '13', '16', '18']).optional(),
  coverColor: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
}).refine((body) => Boolean(body.genre || body.genres?.length), {
  message: 'Selecciona al menos un genero.',
  path: ['genres'],
});
const updateStorySchema = z.object({
  title: z.string().min(2).max(150).optional(),
  synopsis: z.string().min(10).max(3000).optional(),
  genres: z.array(z.string().trim().min(2).max(80)).min(1).max(5).optional(),
  tags: z.array(z.string().trim().min(2).max(100)).max(20).optional(),
  isMature: z.boolean().optional(),
  ageRating: z.enum(['all', '11', '13', '16', '18']).optional(),
  coverColor: z.string().url().nullable().optional(),
}).refine((body) => Object.values(body).some((value) => value !== undefined), {
  message: 'Incluye al menos un cambio.',
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

interface WriterAccess {
  userId: string;
  isAdmin: boolean;
}

async function resolveWriterAccess(request: FastifyRequest): Promise<WriterAccess | null> {
  const userId = bearerClaims(request.headers.authorization)?.userId ?? null;
  if (!userId) return null;
  if (!(await checkDatabaseConnection())) return { userId, isAdmin: false };
  const user = await prisma.user.findFirst({
    where: { id: userId, accountStatus: 'active', deletedAt: null },
    select: { id: true, isAdmin: true },
  });
  return user ? { userId: user.id, isAdmin: user.isAdmin } : null;
}

async function requireWriter(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<WriterAccess | null> {
  const access = await resolveWriterAccess(request);
  if (access) return access;
  if (!(await checkDatabaseConnection())) return { userId: 'guest', isAdmin: false };
  await reply.status(401).send({
    error: { code: 'AUTH_REQUIRED', message: 'Inicia sesion para gestionar tus obras.' },
  });
  return null;
}

async function storyAuthorId(access: WriterAccess, storyId: string): Promise<string | null> {
  if (!access.isAdmin || !(await checkDatabaseConnection())) return access.userId;
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { authorId: true },
  });
  return story?.authorId ?? null;
}

async function chapterAuthorId(
  access: WriterAccess,
  storyId: string,
  chapterId: string,
): Promise<string | null> {
  if (!access.isAdmin || !(await checkDatabaseConnection())) return access.userId;
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, storyId },
    select: { story: { select: { authorId: true } } },
  });
  return chapter?.story.authorId ?? null;
}

async function invalidateStory(storyId: string, chapterId?: string): Promise<void> {
  await contentCache.invalidateTags(storyCacheTags(storyId, chapterId));
}

export function registerWriterRoutes(app: FastifyInstance): void {
  app.get('/v1/me/stories', async (request) => {
    const access = await resolveWriterAccess(request);
    if (!access) return { data: [] };
    const includeArchived = (request.query as { includeArchived?: string })?.includeArchived === 'true';
    return {
      data: access.isAdmin
        ? await writerRepository.getAllStories(includeArchived)
        : await writerRepository.getUserStories(access.userId, includeArchived),
    };
  });

  app.get<{ Params: { storyId: string } }>('/v1/me/stories/:storyId', async (request, reply) => {
    const access = await requireWriter(request, reply);
    if (!access) return;
    const authorId = await storyAuthorId(access, request.params.storyId);
    if (!authorId) {
      return reply.status(404).send({
        error: { code: 'STORY_NOT_FOUND', message: 'No se encontro la obra.' },
      });
    }
    const story = await writerRepository.getUserStory(authorId, request.params.storyId);
    if (!story) {
      return reply.status(404).send({
        error: { code: 'STORY_NOT_FOUND', message: 'No se encontro la obra.' },
      });
    }
    return { data: story };
  });

  app.patch<{ Params: { storyId: string } }>('/v1/me/stories/:storyId', async (request, reply) => {
    const body = updateStorySchema.parse(request.body);
    const access = await requireWriter(request, reply);
    if (!access) return;
    const authorId = await storyAuthorId(access, request.params.storyId);
    if (!authorId) return reply.status(404).send({ error: { code: 'STORY_NOT_FOUND', message: 'No se encontro la obra.' } });
    const story = await writerRepository.updateStory({
      authorId,
      storyId: request.params.storyId,
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.synopsis !== undefined ? { synopsis: body.synopsis } : {}),
      ...(body.genres !== undefined ? { genres: body.genres } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
      ...(body.isMature !== undefined ? { isMature: body.isMature } : {}),
      ...(body.ageRating !== undefined ? { ageRating: body.ageRating } : {}),
      ...(body.coverColor !== undefined ? { coverColor: body.coverColor } : {}),
    });
    if (!story) return reply.status(404).send({ error: { code: 'STORY_NOT_FOUND', message: 'No se encontro la obra.' } });
    await invalidateStory(request.params.storyId);
    return { data: story };
  });

  app.post('/v1/stories', async (request, reply) => {
    const body = createStorySchema.parse(request.body);
    const access = await requireWriter(request, reply);
    if (!access) return;
    const story = await writerRepository.createStory({
      authorId: access.userId,
      title: body.title,
      synopsis: body.synopsis,
      genres: body.genres ?? [body.genre!],
      tags: body.tags,
      ...(body.isMature !== undefined ? { isMature: body.isMature } : {}),
      ...(body.ageRating !== undefined ? { ageRating: body.ageRating } : {}),
      ...(body.coverColor !== undefined ? { coverColor: body.coverColor } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    });
    await invalidateStory(story.id);
    return reply.status(201).send({ data: story });
  });

  app.post<{ Params: { storyId: string } }>('/v1/stories/:storyId/chapters', async (request, reply) => {
    const body = createChapterSchema.parse(request.body);
    const access = await requireWriter(request, reply);
    if (!access) return;
    const authorId = await storyAuthorId(access, request.params.storyId);
    if (!authorId) {
      return reply.status(404).send({
        error: { code: 'STORY_NOT_FOUND', message: 'No se encontro la obra.' },
      });
    }
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
      const access = await requireWriter(request, reply);
      if (!access) return;
      const authorId = await chapterAuthorId(access, request.params.storyId, request.params.chapterId);
      if (!authorId) return reply.status(404).send({ error: { code: 'CHAPTER_NOT_FOUND', message: 'No se encontro el capitulo.' } });
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
      const access = await requireWriter(request, reply);
      if (!access) return;
      const authorId = await chapterAuthorId(access, request.params.storyId, request.params.chapterId);
      if (!authorId) return reply.status(404).send({ error: { code: 'CHAPTER_NOT_FOUND', message: 'No se encontro el capitulo.' } });
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
      const access = await requireWriter(request, reply);
      if (!access) return;
      const authorId = await chapterAuthorId(access, request.params.storyId, request.params.chapterId);
      if (!authorId) return reply.status(404).send({ error: { code: 'CHAPTER_NOT_FOUND', message: 'No se encontro el capitulo.' } });
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
      const access = await requireWriter(request, reply);
      if (!access) return;
      const authorId = await chapterAuthorId(access, request.params.storyId, request.params.chapterId);
      if (!authorId) return reply.status(404).send({ error: { code: 'CHAPTER_NOT_FOUND', message: 'No se encontro el capitulo.' } });
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
      const access = await requireWriter(request, reply);
      if (!access) return;
      const authorId = await chapterAuthorId(access, request.params.storyId, request.params.chapterId);
      if (!authorId) return reply.status(404).send({ error: { code: 'CHAPTER_NOT_FOUND', message: 'No se encontro el capitulo.' } });
      return { data: await writerRepository.revisions(authorId, request.params.chapterId) };
    },
  );

  app.post<{ Params: { storyId: string; chapterId: string; revisionId: string } }>(
    '/v1/me/stories/:storyId/chapters/:chapterId/revisions/:revisionId/restore',
    async (request, reply) => {
      const access = await requireWriter(request, reply);
      if (!access) return;
      const authorId = await chapterAuthorId(access, request.params.storyId, request.params.chapterId);
      if (!authorId) return reply.status(404).send({ error: { code: 'CHAPTER_NOT_FOUND', message: 'No se encontro el capitulo.' } });
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
    const access = await requireWriter(request, reply);
    if (!access) return;
    const authorId = await storyAuthorId(access, request.params.storyId);
    if (!authorId) return reply.status(404).send({ error: { code: 'STORY_NOT_FOUND', message: 'No se encontro la obra.' } });
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
    const access = await requireWriter(request, reply);
    if (!access) return;
    const authorId = await storyAuthorId(access, request.params.storyId);
    if (!authorId) return reply.status(404).send({ error: { code: 'STORY_NOT_FOUND', message: 'No se encontro la obra.' } });
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
    const access = await requireWriter(request, reply);
    if (!access) return;
    const authorId = await storyAuthorId(access, request.params.storyId);
    if (!authorId) return reply.status(404).send({ error: { code: 'STORY_NOT_FOUND', message: 'No se encontro la obra.' } });
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
