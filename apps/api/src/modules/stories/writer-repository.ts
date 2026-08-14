import { prisma, checkDatabaseConnection } from '../../shared/db.js';
import { storyFixtures, chapterFixtures, type StorySummary } from './story-fixtures.js';

export interface CreateStoryParams {
  authorId: string;
  title: string;
  synopsis: string;
  genre: string;
  isMature?: boolean | undefined;
  coverColor?: string | undefined;
}

export interface CreateChapterParams {
  storyId: string;
  title: string;
  content: string[];
}

export class WriterRepository {
  async getUserStories(authorId: string): Promise<StorySummary[]> {
    const isDbConnected = await checkDatabaseConnection();

    if (!isDbConnected) {
      return storyFixtures;
    }

    const stories = await prisma.story.findMany({
      where: { authorId },
      orderBy: { updatedAt: 'desc' },
      include: {
        author: { include: { profile: true } },
        genres: { include: { genre: true } },
      },
    });

    return stories.map((story) => {
      const primaryGenre = story.genres[0]?.genre.name ?? 'General';
      const authorName = story.author.profile?.displayName ?? story.author.username;

      return {
        id: story.id,
        title: story.title,
        author: authorName,
        authorUsername: story.author.username,
        synopsis: story.synopsis,
        genre: primaryGenre,
        status: story.status as any,
        chapterCount: story.publishedChapterCount,
        isMature: story.isMature,
        coverColor: story.coverUrl ?? '#855300',
      };
    });
  }

  async createStory(params: CreateStoryParams): Promise<StorySummary> {
    const isDbConnected = await checkDatabaseConnection();
    const slug = params.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'obra';

    if (!isDbConnected) {
      const newStory: StorySummary = {
        id: `story-${Date.now()}`,
        title: params.title,
        author: 'Marina Solís',
        authorUsername: 'marina-solis',
        synopsis: params.synopsis,
        genre: params.genre,
        status: 'published',
        chapterCount: 0,
        isMature: params.isMature ?? false,
        coverColor: params.coverColor ?? '#855300',
      };
      storyFixtures.unshift(newStory);
      return newStory;
    }

    // Find or connect genre
    const genre = await prisma.genre.findFirst({
      where: { name: { equals: params.genre, mode: 'insensitive' } },
    });

    const data: any = {
      authorId: params.authorId,
      title: params.title,
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      synopsis: params.synopsis,
      status: 'published',
      isMature: params.isMature ?? false,
      coverUrl: params.coverColor ?? '#855300',
    };

    if (genre) {
      data.genres = {
        create: [{ genreId: genre.id }],
      };
    }

    const story = await prisma.story.create({
      data,
      include: {
        author: { include: { profile: true } },
        genres: { include: { genre: true } },
      },
    }) as any;

    const primaryGenre = story.genres[0]?.genre.name ?? params.genre;
    const authorName = story.author.profile?.displayName ?? story.author.username;

    return {
      id: story.id,
      title: story.title,
      author: authorName,
      authorUsername: story.author.username,
      synopsis: story.synopsis,
      genre: primaryGenre,
      status: story.status as any,
      chapterCount: 0,
      isMature: story.isMature,
      coverColor: story.coverUrl ?? '#855300',
    };
  }

  async createChapter(params: CreateChapterParams) {
    const isDbConnected = await checkDatabaseConnection();
    const plainText = params.content.join('\n\n');
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;
    const estimatedReadMin = Math.max(1, Math.ceil(wordCount / 200));
    const slug = params.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'capitulo';

    if (!isDbConnected) {
      const existingChapters = chapterFixtures.filter((c) => c.storyId === params.storyId);
      const position = existingChapters.length + 1;
      const newChapter = {
        id: `chapter-${Date.now()}`,
        storyId: params.storyId,
        position,
        title: params.title,
        content: params.content,
      };
      chapterFixtures.push(newChapter);

      const story = storyFixtures.find((s) => s.id === params.storyId);
      if (story) {
        story.chapterCount += 1;
      }

      return {
        ...newChapter,
        wordCount,
        estimatedReadMin,
      };
    }

    const existingCount = await prisma.chapter.count({
      where: { storyId: params.storyId },
    });
    const position = existingCount + 1;

    const chapter = await prisma.chapter.create({
      data: {
        storyId: params.storyId,
        title: params.title,
        slug: `${slug}-${position}`,
        position,
        status: 'published',
        contentJson: params.content,
        plainText,
        wordCount,
        estimatedReadMin,
        publishedAt: new Date(),
      },
    });

    // Increment publishedChapterCount in Story
    await prisma.story.update({
      where: { id: params.storyId },
      data: {
        publishedChapterCount: { increment: 1 },
        wordCount: { increment: wordCount },
      },
    });

    return {
      id: chapter.id,
      storyId: chapter.storyId,
      position: chapter.position,
      title: chapter.title,
      content: params.content,
      wordCount,
      estimatedReadMin,
    };
  }
}

export const writerRepository = new WriterRepository();
