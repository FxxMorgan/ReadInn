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

export function registerReaderRoutes(app: FastifyInstance): void {
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

    const defaultUserId = 'user-marina-1';
    const existing = await prisma.userProfile.findUnique({
      where: { userId: defaultUserId },
    });

    if (existing) {
      if (mockLibraryIds.has(storyId)) {
        mockLibraryIds.delete(storyId);
      } else {
        mockLibraryIds.add(storyId);
      }
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
