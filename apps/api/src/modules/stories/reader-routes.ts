import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, checkDatabaseConnection } from '../../shared/db.js';
import { storyFixtures } from './story-fixtures.js';

const progressSchema = z.object({
  storyId: z.string(),
  chapterId: z.string(),
  progressPercentage: z.number().min(0).max(100),
  lastPosition: z.number().optional(),
});

const commentSchema = z.object({
  body: z.string().trim().min(1).max(1000),
  authorName: z.string().trim().min(1).max(80).optional(),
});

// In-memory fallback state for library and reading progress
const mockLibraryIds = new Set<string>(['story-lighthouse']);
const mockFollowingIds = new Set<string>(['user-marina-solis']);
const mockProgress: Record<string, { chapterId: string; progressPercentage: number; updatedAt: string }> = {
  'story-lighthouse': {
    chapterId: 'chapter-lighthouse-1',
    progressPercentage: 65,
    updatedAt: new Date().toISOString(),
  },
};

type MockComment = {
  id: string;
  storyId: string;
  chapterId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  likes: number;
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
        authorId: 'user-current',
        authorName: body.authorName ?? 'Invitado',
        body: body.body,
        createdAt: new Date().toISOString(),
        likes: 0,
      };
      mockComments.push(comment);
      return reply.status(201).send({ data: comment });
    }
  );

  app.post<{ Params: { storyId: string } }>('/v1/stories/:storyId/like', async (request) => {
    const key = `user-current:${request.params.storyId}`;
    const liked = mockLikes.has(key);
    if (liked) mockLikes.delete(key);
    else mockLikes.add(key);
    return { data: { storyId: request.params.storyId, liked: !liked } };
  });

  // Toggle story in personal library
  app.post<{ Params: { storyId: string } }>('/v1/library/:storyId', async (request) => {
    const { storyId } = request.params;
    const isDbConnected = await checkDatabaseConnection();

    if (!isDbConnected) {
      const isSaved = mockLibraryIds.has(storyId);
      if (isSaved) {
        mockLibraryIds.delete(storyId);
      } else {
        mockLibraryIds.add(storyId);
      }
      return { data: { saved: !isSaved, storyId } };
    }

    if (mockLibraryIds.has(storyId)) {
      mockLibraryIds.delete(storyId);
    } else {
      mockLibraryIds.add(storyId);
    }

    return { data: { saved: mockLibraryIds.has(storyId), storyId } };
  });

  // Get saved stories in library
  app.get('/v1/library', async () => {
    const isDbConnected = await checkDatabaseConnection();

    if (!isDbConnected) {
      const savedStories = storyFixtures.filter((s) => mockLibraryIds.has(s.id));
      return { data: savedStories };
    }

    const stories = await prisma.story.findMany({
      where: {
        id: { in: Array.from(mockLibraryIds) },
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

  // Toggle follow author
  app.post<{ Params: { authorId: string } }>('/v1/follows/:authorId', async (request) => {
    const { authorId } = request.params;
    const isFollowing = mockFollowingIds.has(authorId);

    if (isFollowing) {
      mockFollowingIds.delete(authorId);
    } else {
      mockFollowingIds.add(authorId);
    }

    return { data: { following: !isFollowing, authorId } };
  });

  // Save reading progress
  app.post('/v1/reading-progress', async (request) => {
    const body = progressSchema.parse(request.body);
    mockProgress[body.storyId] = {
      chapterId: body.chapterId,
      progressPercentage: body.progressPercentage,
      updatedAt: new Date().toISOString(),
    };

    return { data: { success: true, ...mockProgress[body.storyId] } };
  });

  // Get continue reading list
  app.get('/v1/reading-progress', async () => {
    const items = Object.entries(mockProgress).map(([storyId, info]) => {
      const story = storyFixtures.find((s) => s.id === storyId);
      return {
        storyId,
        storyTitle: story?.title ?? 'Obra',
        coverColor: story?.coverColor ?? '#855300',
        chapterId: info.chapterId,
        progressPercentage: info.progressPercentage,
        updatedAt: info.updatedAt,
      };
    });

    return { data: items };
  });
}
