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
      const comment: MockComment = {
        id: `comment-${crypto.randomUUID()}`,
        storyId: request.params.storyId,
        chapterId: request.params.chapterId,
        authorId: requestUserId(request),
        authorName: body.authorName ?? 'Invitado',
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

  app.post<{ Params: { storyId: string } }>('/v1/stories/:storyId/rating', async (request) => {
    const body = z.object({ rating: z.number().min(0).max(5) }).parse(request.body);
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
