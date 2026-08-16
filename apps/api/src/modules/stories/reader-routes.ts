import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, checkDatabaseConnection } from '../../shared/db.js';
import { storyFixtures } from './story-fixtures.js';
import { bearerClaims } from '../../shared/auth.js';

const progressSchema = z.object({
  storyId: z.string(),
  chapterId: z.string(),
  progressPercentage: z.number().min(0).max(100),
  lastPosition: z.number().optional(),
  isCompleted: z.boolean().optional(),
  seenChapterIds: z.array(z.string()).optional(),
});

const commentSchema = z.object({
  body: z.string().trim().min(1).max(1000),
  authorName: z.string().trim().min(1).max(80).optional(),
  paragraphIndex: z.number().int().min(0).optional(),
});

// In-memory fallback state is keyed by user so one account never sees another
// account's library, progress, likes, or ratings when the database is offline.
const mockLibraryKeys = new Set<string>();
const mockProgress: Record<string, { chapterId: string; progressPercentage: number; updatedAt: string; isCompleted: boolean; seenChapterIds: string[] }> = {};

type MockComment = {
  id: string;
  storyId: string;
  chapterId: string;
  authorId: string;
  authorName: string;
  authorUsername?: string;
  body: string;
  createdAt: string;
  likes: number;
  paragraphIndex?: number;
};

const mockComments: MockComment[] = [
  {
    id: 'comment-lighthouse-1',
    storyId: 'story-lighthouse',
    chapterId: 'chapter-lighthouse-1',
    authorId: 'user-reader-1',
    authorName: 'Lucía M.',
    body: 'La imagen del faro apagado se queda contigo. Muy buen inicio.',
    createdAt: new Date().toISOString(),
    likes: 4,
  },
  {
    id: 'comment-lighthouse-2',
    storyId: 'story-lighthouse',
    chapterId: 'chapter-lighthouse-1',
    authorId: 'user-reader-2',
    authorName: 'Nico Rojas',
    body: 'El mapa dentro de la caja de fósforos es un detalle precioso.',
    createdAt: new Date().toISOString(),
    likes: 2,
  },
];

const mockLikes = new Set<string>();
const mockRatings = new Map<string, Map<string, number>>();
const mockFollowers = new Set<string>();
const mockReads = new Map<string, number>([['story-lighthouse', 24580], ['story-quiet-city', 8210]]);

function requestUserId(request: { headers: { authorization?: unknown } }): string {
  const authorization = request.headers.authorization;
  const claims = bearerClaims(authorization);
  if (claims) return claims.userId;
  const token = typeof authorization === 'string' ? authorization.replace(/^Bearer\s+/i, '') : undefined;
  return token ? `token:${token}` : 'guest';
}

function authenticatedUserId(request: { headers: { authorization?: unknown } }): string | null {
  return bearerClaims(request.headers.authorization)?.userId ?? null;
}

function libraryKey(userId: string, storyId: string): string {
  return `${userId}:${storyId}`;
}

export function registerReaderRoutes(app: FastifyInstance): void {
  // Chapter comments. These remain available when the database is offline and
  // use the same response shape as the persistent implementation will use.
  app.get<{ Params: { storyId: string; chapterId: string } }>(
    '/v1/stories/:storyId/chapters/:chapterId/comments',
    async (request) => {
      const { storyId, chapterId } = request.params;
      const isFixture = storyFixtures.some((story) => story.id === storyId);
      if (!isFixture && await checkDatabaseConnection()) {
        const comments = await prisma.chapterComment.findMany({
          where: { storyId, chapterId },
          orderBy: { createdAt: 'desc' },
          include: { author: { include: { profile: true } } },
        });
        return {
          data: comments.map((comment) => ({
            id: comment.id,
            storyId: comment.storyId,
            chapterId: comment.chapterId,
            authorId: comment.authorId,
            authorName: comment.authorName,
            authorUsername: comment.author?.username,
            body: comment.body,
            createdAt: comment.createdAt.toISOString(),
            likes: comment.likes,
            ...(comment.paragraphIndex !== null ? { paragraphIndex: comment.paragraphIndex } : {}),
          })),
        };
      }
      return {
        data: mockComments
          .filter((comment) => comment.storyId === storyId && comment.chapterId === chapterId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      };
    }
  );

  app.post<{ Params: { storyId: string; chapterId: string } }>(
    '/v1/stories/:storyId/chapters/:chapterId/comments',
    async (request, reply) => {
      const body = commentSchema.parse(request.body);
      const isFixture = storyFixtures.some((story) => story.id === request.params.storyId);
      if (!isFixture && await checkDatabaseConnection()) {
        const chapter = await prisma.chapter.findFirst({
          where: {
            id: request.params.chapterId,
            storyId: request.params.storyId,
            status: { not: 'archived' },
          },
          select: { id: true },
        });
        if (!chapter) {
          return reply.status(404).send({
            error: { code: 'CHAPTER_NOT_FOUND', message: 'No se encontro el capitulo.' },
          });
        }
        const userId = authenticatedUserId(request);
        const author = userId
          ? await prisma.user.findUnique({
              where: { id: userId },
              include: { profile: true },
            }).catch(() => null)
          : null;
        const comment = await prisma.chapterComment.create({
          data: {
            storyId: request.params.storyId,
            chapterId: request.params.chapterId,
            ...(author ? { authorId: author.id } : {}),
            authorName: author?.profile?.displayName ?? body.authorName ?? 'Invitado',
            body: body.body,
            ...(body.paragraphIndex !== undefined ? { paragraphIndex: body.paragraphIndex } : {}),
          },
          include: { author: true },
        });
        return reply.status(201).send({
          data: {
            id: comment.id,
            storyId: comment.storyId,
            chapterId: comment.chapterId,
            authorId: comment.authorId,
            authorName: comment.authorName,
            authorUsername: comment.author?.username,
            body: comment.body,
            createdAt: comment.createdAt.toISOString(),
            likes: comment.likes,
            ...(comment.paragraphIndex !== null ? { paragraphIndex: comment.paragraphIndex } : {}),
          },
        });
      }
      const authorUsername = bearerClaims(request.headers.authorization)?.email?.split('@')[0];
      const comment: MockComment = {
        id: `comment-${crypto.randomUUID()}`,
        storyId: request.params.storyId,
        chapterId: request.params.chapterId,
        authorId: requestUserId(request),
        authorName: body.authorName ?? 'Invitado',
        ...(authorUsername ? { authorUsername } : {}),
        body: body.body,
        createdAt: new Date().toISOString(),
        likes: 0,
        ...(body.paragraphIndex !== undefined
          ? { paragraphIndex: body.paragraphIndex }
          : {}),
      };
      mockComments.push(comment);
      return reply.status(201).send({ data: comment });
    }
  );

  app.post<{ Params: { storyId: string } }>('/v1/stories/:storyId/like', async (request) => {
    const key = `${requestUserId(request)}:${request.params.storyId}`;
    const liked = mockLikes.has(key);
    if (liked) mockLikes.delete(key);
    else mockLikes.add(key);
    return { data: { storyId: request.params.storyId, liked: !liked } };
  });

  app.get<{ Params: { storyId: string } }>('/v1/stories/:storyId/engagement', async (request) => {
    const isFixture = storyFixtures.some((story) => story.id === request.params.storyId);
    const isDbConnected = await checkDatabaseConnection();
    if (isDbConnected && !isFixture) {
      const userId = authenticatedUserId(request);
      const story = await prisma.story.findUnique({
        where: { id: request.params.storyId },
        select: { authorId: true },
      });
      const [ratings, userRating, reads, comments, followers] = await Promise.all([
        prisma.storyRating.aggregate({
          where: { storyId: request.params.storyId },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        userId
          ? prisma.storyRating.findUnique({
              where: { storyId_userId: { storyId: request.params.storyId, userId } },
              select: { rating: true },
            })
          : null,
        prisma.readingEvent.count({
          where: { storyId: request.params.storyId, eventType: 'chapter_opened' },
        }),
        prisma.chapterComment.count({ where: { storyId: request.params.storyId } }),
        story ? prisma.userFollow.count({ where: { followingId: story.authorId } }) : 0,
      ]);
      return {
        data: {
          storyId: request.params.storyId,
          reads,
          followers,
          comments,
          averageRating: ratings._avg.rating ?? 0,
          ratingCount: ratings._count._all,
          userRating: userRating?.rating ?? 0,
          liked: mockLikes.has(`${requestUserId(request)}:${request.params.storyId}`),
          saved: mockLibraryKeys.has(
            libraryKey(requestUserId(request), request.params.storyId),
          ),
        },
      };
    }

    const ratings = mockRatings.get(request.params.storyId) ?? new Map<string, number>();
    const values = [...ratings.values()];
    const userId = requestUserId(request);
    return {
      data: {
        storyId: request.params.storyId,
        reads: mockReads.get(request.params.storyId) ?? 0,
        followers: mockFollowers.size,
        comments: mockComments.filter((item) => item.storyId === request.params.storyId).length,
        averageRating: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
        ratingCount: values.length,
        userRating: ratings.get(userId) ?? 0,
        liked: mockLikes.has(`${userId}:${request.params.storyId}`),
        saved: mockLibraryKeys.has(
          libraryKey(userId, request.params.storyId),
        ),
      },
    };
  });

  app.post<{ Params: { storyId: string } }>('/v1/stories/:storyId/rating', async (request, reply) => {
    const body = z.object({ rating: z.number().int().min(0).max(5) }).parse(request.body);
    const isFixture = storyFixtures.some((story) => story.id === request.params.storyId);
    const isDbConnected = await checkDatabaseConnection();
    if (isDbConnected && !isFixture) {
      const userId = authenticatedUserId(request);
      if (!userId) {
        return reply.status(401).send({
          error: { code: 'AUTH_REQUIRED', message: 'Inicia sesion para calificar una obra.' },
        });
      }
      if (body.rating === 0) {
        await prisma.storyRating.deleteMany({
          where: { storyId: request.params.storyId, userId },
        });
      } else {
        await prisma.storyRating.upsert({
          where: { storyId_userId: { storyId: request.params.storyId, userId } },
          create: { storyId: request.params.storyId, userId, rating: body.rating },
          update: { rating: body.rating },
        });
      }
      return { data: { storyId: request.params.storyId, rating: body.rating } };
    }

    const storyRatings = mockRatings.get(request.params.storyId) ?? new Map<string, number>();
    if (body.rating === 0) storyRatings.delete(requestUserId(request));
    else storyRatings.set(requestUserId(request), body.rating);
    mockRatings.set(request.params.storyId, storyRatings);
    return { data: { storyId: request.params.storyId, rating: body.rating } };
  });

  app.post<{ Params: { authorId: string } }>('/v1/follows/:authorId', async (request) => {
    const key = `${requestUserId(request)}:${request.params.authorId}`;
    if (mockFollowers.has(key)) mockFollowers.delete(key);
    else mockFollowers.add(key);
    return { data: { authorId: request.params.authorId, following: mockFollowers.has(key) } };
  });

  // Toggle story in personal library
  app.post<{ Params: { storyId: string } }>('/v1/library/:storyId', async (request) => {
    const { storyId } = request.params;
    const userId = requestUserId(request);
    const key = libraryKey(userId, storyId);
    const isDbConnected = await checkDatabaseConnection();

    if (!isDbConnected) {
      const isSaved = mockLibraryKeys.has(key);
      if (isSaved) {
        mockLibraryKeys.delete(key);
      } else {
        mockLibraryKeys.add(key);
      }
      return { data: { saved: !isSaved, storyId } };
    }

    if (mockLibraryKeys.has(key)) {
      mockLibraryKeys.delete(key);
    } else {
      mockLibraryKeys.add(key);
    }

    return { data: { saved: mockLibraryKeys.has(key), storyId } };
  });

  // Get saved stories in library
  app.get('/v1/library', async (request) => {
    const userId = requestUserId(request);
    const savedIds = Array.from(mockLibraryKeys)
      .filter((key) => key.startsWith(`${userId}:`))
      .map((key) => key.slice(userId.length + 1));
    const isDbConnected = await checkDatabaseConnection();

    if (!isDbConnected) {
      const savedStories = storyFixtures.filter((s) => savedIds.includes(s.id));
      return { data: savedStories };
    }

    const stories = await prisma.story.findMany({
      where: {
        id: { in: savedIds },
      },
      include: {
        author: { include: { profile: true } },
        genres: { include: { genre: true } },
      },
    });

    const data = stories.map((story) => ({
      id: story.id,
      title: story.title,
      author: story.author.profile?.displayName ?? story.author.username,
      authorUsername: story.author.username,
      synopsis: story.synopsis,
      genre: story.genres[0]?.genre.name ?? 'General',
      status: story.status,
      chapterCount: story.publishedChapterCount,
      isMature: story.isMature,
      coverColor: story.coverUrl ?? '#855300',
    }));

    return { data };
  });

  // Save reading progress
  app.post('/v1/reading-progress', async (request) => {
    const body = progressSchema.parse(request.body);
    const userId = requestUserId(request);
    const key = libraryKey(userId, body.storyId);
    const previous = mockProgress[key];
    const seenChapterIds = Array.from(
      new Set([...(previous?.seenChapterIds ?? []), ...(body.seenChapterIds ?? []), body.chapterId]),
    );
    mockProgress[key] = {
      chapterId: body.chapterId,
      progressPercentage: body.progressPercentage,
      updatedAt: new Date().toISOString(),
      isCompleted: body.isCompleted ?? body.progressPercentage >= 100,
      seenChapterIds,
    };

    return { data: { success: true, ...mockProgress[key] } };
  });

  // Get continue reading list
  app.get('/v1/reading-progress', async (request) => {
    const userId = requestUserId(request);
    const items = Object.entries(mockProgress)
      .filter(([key]) => key.startsWith(`${userId}:`))
      .map(([key, info]) => {
      const storyId = key.slice(userId.length + 1);
      const story = storyFixtures.find((s) => s.id === storyId);
      return {
        storyId,
        storyTitle: story?.title ?? 'Obra',
        coverColor: story?.coverColor ?? '#855300',
        chapterId: info.chapterId,
        progressPercentage: info.progressPercentage,
        isCompleted: info.isCompleted,
        seenChapterIds: info.seenChapterIds,
        updatedAt: info.updatedAt,
      };
      });

    return { data: items };
  });

  app.get<{ Params: { storyId: string } }>('/v1/stories/:storyId/reading-progress', async (request) => {
    const info = mockProgress[
      libraryKey(requestUserId(request), request.params.storyId)
    ];
    return { data: info ? { storyId: request.params.storyId, ...info } : null };
  });
}
