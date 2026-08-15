import { prisma, checkDatabaseConnection } from '../../shared/db.js';
import { chapterFixtures, storyFixtures, type Chapter, type StorySummary } from './story-fixtures.js';

export interface GetStoriesParams {
  query?: string | undefined;
  genre?: string | undefined;
  sort?: 'recent' | 'popular' | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export class StoryRepository {
  async getStories({ query, genre, page = 1, limit = 20 }: GetStoriesParams) {
    const isDbConnected = await checkDatabaseConnection();

    if (!isDbConnected) {
      // Graceful fixture fallback
      const normalizedQuery = query?.toLocaleLowerCase('es');
      const filtered = storyFixtures.filter((story) => {
        if (story.status !== 'published') return false;
        const matchesGenre =
          !genre || genre === 'Todos' || story.genre.toLocaleLowerCase('es') === genre.toLocaleLowerCase('es');
        const searchable = `${story.title} ${story.author} ${story.synopsis}`.toLocaleLowerCase('es');
        const matchesText = !normalizedQuery || searchable.includes(normalizedQuery);
        return matchesGenre && matchesText;
      });

      const start = (page - 1) * limit;
      const data = filtered.slice(start, start + limit);
      return {
        data,
        meta: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
          source: 'fixture',
        },
      };
    }

    // Query real PostgreSQL DB via Prisma
    const where: any = {
      status: 'published',
    };

    if (query && query.trim()) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { synopsis: { contains: query, mode: 'insensitive' } },
        { author: { profile: { displayName: { contains: query, mode: 'insensitive' } } } },
      ];
    }

    if (genre && genre !== 'Todos' && genre !== 'Todo') {
      where.genres = {
        some: {
          genre: {
            name: { equals: genre, mode: 'insensitive' },
          },
        },
      };
    }

    const [total, stories] = await Promise.all([
      prisma.story.count({ where }),
      prisma.story.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: {
            include: { profile: true },
          },
          genres: {
            include: { genre: true },
          },
        },
      }),
    ]);

    const data: StorySummary[] = stories.map((story) => {
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

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        source: 'database',
      },
    };
  }

  async getStoryById(storyId: string) {
    // Fixture IDs are part of the public demo contract and must remain
    // readable even when the production database is available.
    const fixtureStory = storyFixtures.find((candidate) => candidate.id === storyId && candidate.status === 'published');
    if (fixtureStory) {
      const chapters = chapterFixtures
        .filter((chapter) => chapter.storyId === fixtureStory.id)
        .map((chapter) => ({
          id: chapter.id,
          storyId: chapter.storyId,
          position: chapter.position,
          title: chapter.title,
        }));

      return {
        ...fixtureStory,
        chapters,
      };
    }

    const isDbConnected = await checkDatabaseConnection();

    if (!isDbConnected) {
      const story = storyFixtures.find((candidate) => candidate.id === storyId && candidate.status === 'published');
      if (!story) return null;

      const chapters = chapterFixtures
        .filter((chapter) => chapter.storyId === story.id)
        .map((chapter) => ({
          id: chapter.id,
          storyId: chapter.storyId,
          position: chapter.position,
          title: chapter.title,
        }));

      return {
        ...story,
        chapters,
      };
    }

    const story = await prisma.story.findFirst({
      where: {
        status: 'published',
        OR: [{ id: storyId }, { slug: storyId }],
      },
      include: {
        author: {
          include: { profile: true },
        },
        genres: {
          include: { genre: true },
        },
        chapters: {
          where: { status: 'published' },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            storyId: true,
            position: true,
            title: true,
          },
        },
      },
    });

    if (!story) return null;

    const primaryGenre = story.genres[0]?.genre.name ?? 'General';
    const authorName = story.author.profile?.displayName ?? story.author.username;

    return {
      id: story.id,
      title: story.title,
      author: authorName,
      authorUsername: story.author.username,
      synopsis: story.synopsis,
      genre: primaryGenre,
      status: story.status,
      chapterCount: story.chapters.length,
      isMature: story.isMature,
      coverColor: story.coverUrl ?? '#855300',
      chapters: story.chapters,
    };
  }

  async getChapterById(storyId: string, chapterId: string) {
    // Resolve fixture chapters before Prisma so stable demo IDs do not get
    // rejected by PostgreSQL UUID parsing in a connected environment.
    const fixtureChapter = chapterFixtures.find(
      (candidate) => candidate.storyId === storyId && candidate.id === chapterId,
    );
    if (fixtureChapter) {
      const story = storyFixtures.find((candidate) => candidate.id === storyId);
      return {
        ...fixtureChapter,
        storyTitle: story?.title ?? 'Obra',
      };
    }
    if (storyFixtures.some((candidate) => candidate.id === storyId)) return null;

    const isDbConnected = await checkDatabaseConnection();

    if (!isDbConnected) {
      const chapter = chapterFixtures.find(
        (candidate) => candidate.storyId === storyId && candidate.id === chapterId
      );
      if (!chapter) return null;

      const story = storyFixtures.find((candidate) => candidate.id === chapter.storyId);
      return {
        ...chapter,
        storyTitle: story?.title ?? 'Obra',
      };
    }

    const chapter = await prisma.chapter.findFirst({
      where: {
        status: 'published',
        story: { status: 'published' },
        OR: [{ id: chapterId }, { slug: chapterId }],
      },
      include: {
        story: {
          select: { title: true, id: true },
        },
      },
    });

    if (!chapter) return null;

    let content: string[] = [];
    if (Array.isArray(chapter.contentJson)) {
      content = chapter.contentJson.map((item) => String(item));
    } else {
      content = [chapter.plainText];
    }

    return {
      id: chapter.id,
      storyId: chapter.storyId,
      storyTitle: chapter.story.title,
      position: chapter.position,
      title: chapter.title,
      content,
    };
  }
}

export const storyRepository = new StoryRepository();
