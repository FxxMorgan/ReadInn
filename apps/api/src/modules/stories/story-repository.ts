import type { Prisma } from '@prisma/client';
import { prisma, checkDatabaseConnection } from '../../shared/db.js';
import { contentCache } from '../../shared/content-cache.js';
import { chapterIdentifier, storyIdentifier } from '../../shared/identifiers.js';
import { chapterFixtures, storyFixtures, type StorySummary } from './story-fixtures.js';

export interface GetStoriesParams {
  query?: string | undefined;
  genre?: string | undefined;
  genres?: string[] | undefined;
  tags?: string[] | undefined;
  genreMode?: 'any' | 'all' | undefined;
  tagMode?: 'any' | 'all' | undefined;
  mature?: 'exclude' | 'include' | 'only' | undefined;
  ageRatings?: string[] | undefined;
  creationMethod?: 'all' | 'human' | 'ai_assisted' | 'ai_generated' | undefined;
  language?: string | undefined;
  minChapters?: number | undefined;
  minRating?: number | undefined;
  sort?: 'recent' | 'popular' | 'rating' | 'chapters' | 'title' | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export class StoryRepository {
  async getSitemapStories() {
    if (!(await checkDatabaseConnection())) {
      return storyFixtures
        .filter((story) => story.status === 'published' || story.status === 'completed')
        .map((story) => ({
          id: story.id,
          authorUsername: story.authorUsername,
          ...(story.updatedAt ? { updatedAt: story.updatedAt } : {}),
        }));
    }
    const stories = await prisma.story.findMany({
      where: { status: { in: ['published', 'completed'] } },
      orderBy: { updatedAt: 'desc' },
      take: 50_000,
      select: {
        id: true,
        updatedAt: true,
        author: { select: { username: true } },
      },
    });
    return stories.map((story) => ({
      id: story.id,
      authorUsername: story.author.username,
      updatedAt: story.updatedAt.toISOString(),
    }));
  }

  async getStories(params: GetStoriesParams) {
    const normalized = {
      query: params.query?.trim().toLocaleLowerCase('es') ?? '',
      genre: params.genre?.trim().toLocaleLowerCase('es') ?? '',
      genres: (params.genres ?? []).map((value) => value.trim().toLocaleLowerCase('es')).sort(),
      tags: (params.tags ?? []).map((value) => value.trim().toLocaleLowerCase('es')).sort(),
      genreMode: params.genreMode ?? 'any',
      tagMode: params.tagMode ?? 'any',
      mature: params.mature ?? 'exclude',
      ageRatings: (params.ageRatings ?? []).sort(),
      creationMethod: params.creationMethod ?? 'all',
      language: params.language?.trim().toLocaleLowerCase('es') ?? '',
      minChapters: params.minChapters ?? 0,
      minRating: params.minRating ?? 0,
      sort: params.sort ?? 'recent',
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    };
    const loader = () => this.getStoriesUncached(normalized);
    if (normalized.query || normalized.page > 5) return loader();
    return contentCache.remember(
      `stories:${JSON.stringify(normalized)}`,
      ['catalog'],
      loader,
    );
  }

  private async getStoriesUncached({ query, genre, genres = [], tags = [], genreMode = 'any', tagMode = 'any', mature = 'exclude', ageRatings = [], creationMethod = 'all', language, minChapters = 0, minRating = 0, sort = 'recent', page = 1, limit = 20 }: GetStoriesParams) {
    const isDbConnected = await checkDatabaseConnection();

    if (!isDbConnected) {
      // Graceful fixture fallback
      const normalizedQuery = query?.toLocaleLowerCase('es');
      const selectedGenres = [...new Set([...(genre ? [genre] : []), ...genres])].filter((value) => value && value !== 'Todos');
      const filtered = storyFixtures.filter((story) => {
        if (story.status !== 'published') return false;
        if (mature === 'exclude' && story.isMature) return false;
        if (mature === 'only' && !story.isMature) return false;
        if (ageRatings.length && !ageRatings.includes(story.ageRating ?? (story.isMature ? '18' : 'all'))) return false;
        if (creationMethod !== 'all' && (story.creationMethod ?? 'human') !== creationMethod) return false;
        const storyGenres = (story.genres ?? [story.genre]).map((value) => value.toLocaleLowerCase('es'));
        const matchesGenre = !selectedGenres.length || (genreMode === 'all'
          ? selectedGenres.every((value) => storyGenres.includes(value.toLocaleLowerCase('es')))
          : selectedGenres.some((value) => storyGenres.includes(value.toLocaleLowerCase('es'))));
        const storyTags = (story.tags ?? []).map((tag) => tag.name.toLocaleLowerCase('es'));
        const matchesTags = !tags.length || (tagMode === 'all'
          ? tags.every((value) => storyTags.includes(value.toLocaleLowerCase('es')))
          : tags.some((value) => storyTags.includes(value.toLocaleLowerCase('es'))));
        if (!matchesTags || (language && story.languageCode !== language)) return false;
        const searchable = `${story.title} ${story.author} ${story.synopsis}`.toLocaleLowerCase('es');
        const matchesText = !normalizedQuery || searchable.includes(normalizedQuery);
        return matchesGenre && matchesText;
      });

      const start = (page - 1) * limit;
      const data = filtered.slice(start, start + limit);
      return {
        data: sort === 'title' ? [...data].sort((a, b) => a.title.localeCompare(b.title, 'es')) : data,
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
    const where: Prisma.StoryWhereInput = {
      status: 'published',
    };
    const andFilters: Prisma.StoryWhereInput[] = [];

    if (mature === 'exclude') where.isMature = false;
    if (mature === 'only') where.isMature = true;
    if (ageRatings.length) where.ageRating = { in: ageRatings };
    if (creationMethod !== 'all') where.creationMethod = creationMethod;
    if (language) where.languageCode = language;
    if (minChapters > 0) where.publishedChapterCount = { gte: minChapters };

    if (query && query.trim()) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { synopsis: { contains: query, mode: 'insensitive' } },
        { attributionName: { contains: query, mode: 'insensitive' } },
        { author: { profile: { displayName: { contains: query, mode: 'insensitive' } } } },
        { author: { username: { contains: query, mode: 'insensitive' } } },
        { genres: { some: { genre: { name: { contains: query, mode: 'insensitive' } } } } },
        { tags: { some: { tag: { name: { contains: query, mode: 'insensitive' } } } } },
      ];
    }

    const selectedGenres = [...new Set([...(genre ? [genre] : []), ...genres])].filter((value) => value && value !== 'Todos' && value !== 'Todo');
    if (selectedGenres.length) {
      if (genreMode === 'all') {
        andFilters.push(...selectedGenres.map((name) => ({
          genres: { some: { genre: { name: { equals: name, mode: 'insensitive' as const } } } },
        })));
      } else {
        where.genres = { some: { genre: { name: { in: selectedGenres, mode: 'insensitive' } } } };
      }
    }
    if (tags.length) {
      if (tagMode === 'all') {
        andFilters.push(...tags.map((name) => ({
          tags: { some: { tag: { name: { equals: name, mode: 'insensitive' as const } } } },
        })));
      } else {
        where.tags = { some: { tag: { name: { in: tags, mode: 'insensitive' } } } };
      }
    }

    if (andFilters.length) where.AND = andFilters;

    if (minRating > 0) where.averageRating = { gte: minRating };

    const orderBy: Prisma.StoryOrderByWithRelationInput[] = sort === 'title'
      ? [{ title: 'asc' }]
      : sort === 'chapters'
        ? [{ publishedChapterCount: 'desc' }, { publishedAt: 'desc' }]
        : sort === 'rating'
          ? [{ averageRating: 'desc' }, { ratingCount: 'desc' }]
          : sort === 'popular'
            ? [{ readCount: 'desc' }, { publishedAt: 'desc' }]
            : [{ publishedAt: 'desc' }];

    const [stories, total] = await prisma.$transaction([
      prisma.story.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          author: {
            include: { profile: true },
          },
          genres: {
            include: { genre: true },
          },
          tags: {
            include: { tag: true },
          },
        },
      }),
      prisma.story.count({ where }),
    ]);

    const data: StorySummary[] = stories.map((story) => {
      const primaryGenre = story.genres[0]?.genre.name ?? 'General';
      const authorName = story.attributionName ?? story.author.profile?.displayName ?? story.author.username;
      return {
        id: story.id,
        title: story.title,
        author: authorName,
        authorUsername: story.author.username,
        synopsis: story.synopsis,
        genre: primaryGenre,
        genres: story.genres.map((item) => item.genre.name),
        tags: story.tags.map((item) => ({ name: item.tag.name, kind: item.tag.kind })),
        languageCode: story.languageCode,
        ageRating: story.ageRating as NonNullable<StorySummary['ageRating']>,
        creationMethod: story.creationMethod,
        status: story.status,
        chapterCount: story.publishedChapterCount,
        isMature: story.isMature,
        coverColor: story.coverUrl ?? '#855300',
        averageRating: story.averageRating,
        ratingCount: story.ratingCount,
        updatedAt: story.updatedAt.toISOString(),
        ...(story.sourceUrl ? { sourceUrl: story.sourceUrl } : {}),
        ...(story.sourceLicense ? { sourceLicense: story.sourceLicense } : {}),
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

  async getFeaturedStory() {
    const day = new Date().toISOString().slice(0, 10);
    return contentCache.remember(`featured:${day}`, ['catalog'], async () => {
      const result = await this.getStories({ sort: 'popular', page: 1, limit: 1, mature: 'exclude' });
      if (!result.data.length || !(await checkDatabaseConnection())) return result.data[0] ?? null;
      const events = await prisma.readingEvent.findMany({
        where: {
          storyId: { in: result.data.map((story) => story.id) },
          createdAt: { gte: new Date(Date.now() - 86_400_000) },
        },
        select: { storyId: true, readerKey: true },
      });
      const ownership = await prisma.story.findMany({
        where: { id: { in: result.data.map((story) => story.id) } },
        select: { id: true, authorId: true },
      });
      const authorByStory = new Map(ownership.map((story) => [story.id, story.authorId]));
      const followerGroups = ownership.length ? await prisma.userFollow.groupBy({
        by: ['followingId'],
        where: { followingId: { in: [...new Set(ownership.map((story) => story.authorId))] } },
        _count: { _all: true },
      }) : [];
      const followersByAuthor = new Map(followerGroups.map((group) => [group.followingId, group._count._all]));
      const readersByStory = new Map<string, Set<string>>();
      for (const event of events) {
        const readers = readersByStory.get(event.storyId) ?? new Set<string>();
        readers.add(event.readerKey);
        readersByStory.set(event.storyId, readers);
      }
      return [...result.data].sort((a, b) => {
        const readerDifference = (readersByStory.get(b.id)?.size ?? 0) - (readersByStory.get(a.id)?.size ?? 0);
        if (readerDifference) return readerDifference;
        const followerDifference = (followersByAuthor.get(authorByStory.get(b.id) ?? '') ?? 0)
          - (followersByAuthor.get(authorByStory.get(a.id) ?? '') ?? 0);
        if (followerDifference) return followerDifference;
        const ratingDifference = (b.averageRating ?? 0) - (a.averageRating ?? 0);
        if (ratingDifference) return ratingDifference;
        return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
      })[0] ?? null;
    }, 86_400);
  }

  async getStoryById(storyId: string) {
    return contentCache.remember(
      `story:${storyId}`,
      [`story:${storyId}`],
      () => this.getStoryByIdUncached(storyId),
    );
  }

  private async getStoryByIdUncached(storyId: string) {
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
        ...storyIdentifier(storyId),
      },
      include: {
        author: {
          include: { profile: true },
        },
        genres: {
          include: { genre: true },
        },
        tags: {
          include: { tag: true },
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
    const authorName = story.attributionName ?? story.author.profile?.displayName ?? story.author.username;

    return {
      id: story.id,
      title: story.title,
      author: authorName,
      authorUsername: story.author.username,
      synopsis: story.synopsis,
      genre: primaryGenre,
      genres: story.genres.map((item) => item.genre.name),
      tags: story.tags.map((item) => ({ name: item.tag.name, kind: item.tag.kind })),
      languageCode: story.languageCode,
      ageRating: story.ageRating,
      creationMethod: story.creationMethod,
      status: story.status,
      chapterCount: story.chapters.length,
      isMature: story.isMature,
      coverColor: story.coverUrl ?? '#855300',
      ...(story.sourceUrl ? { sourceUrl: story.sourceUrl } : {}),
      ...(story.sourceLicense ? { sourceLicense: story.sourceLicense } : {}),
      chapters: story.chapters,
    };
  }

  async getChapterById(storyId: string, chapterId: string) {
    return contentCache.remember(
      `chapter:${storyId}:${chapterId}`,
      [`story:${storyId}`, `chapter:${chapterId}`],
      () => this.getChapterByIdUncached(storyId, chapterId),
    );
  }

  private async getChapterByIdUncached(storyId: string, chapterId: string) {
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
        story: { status: 'published', ...storyIdentifier(storyId) },
        ...chapterIdentifier(chapterId),
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
      content = chapter.contentJson.map((item) => typeof item === 'string' ? item : JSON.stringify(item) ?? '');
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
      plainText: chapter.plainText,
    };
  }
}

export const storyRepository = new StoryRepository();
