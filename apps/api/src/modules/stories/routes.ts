import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../shared/errors.js';
import { storyRepository } from './story-repository.js';
import { buildEpub, buildPdf, type ExportChapter } from './story-export.js';
import { storyTaxonomyResponse } from './story-taxonomy.js';
import { bearerClaims } from '../../shared/auth.js';
import { checkDatabaseConnection, prisma } from '../../shared/db.js';

const csvValues = z.preprocess((value) => {
  if (Array.isArray(value)) return value.flatMap((item) => String(item).split(','));
  if (typeof value === 'string') return value.split(',');
  return value;
}, z.array(z.string().trim().min(1).max(100)).max(20).optional());

const listQuerySchema = z.object({
  query: z.string().trim().max(100).optional(),
  genre: z.string().trim().max(50).optional(),
  genres: csvValues,
  tags: csvValues,
  genreMode: z.enum(['any', 'all']).default('any'),
  tagMode: z.enum(['any', 'all']).default('any'),
  mature: z.enum(['exclude', 'include', 'only']).default('exclude'),
  ageRatings: csvValues,
  language: z.string().trim().min(2).max(10).optional(),
  minChapters: z.coerce.number().int().min(0).max(10000).default(0),
  minRating: z.coerce.number().min(0).max(5).default(0),
  sort: z.enum(['recent', 'popular', 'rating', 'chapters', 'title']).default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const storyDownloadQuerySchema = z.object({
  format: z.enum(['epub', 'pdf']).default('epub'),
});

function safeFilename(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase() || 'obra';
}

async function requireAdultAccess(request: FastifyRequest, storyId: string): Promise<void> {
  if (!(await checkDatabaseConnection())) return;
  const story = await prisma.story.findFirst({
    where: { OR: [{ id: storyId }, { slug: storyId }] },
    select: { ageRating: true },
  });
  if (!story || story.ageRating !== '18') return;
  const claims = bearerClaims(request.headers.authorization);
  if (!claims) throw new AppError('ADULT_AUTH_REQUIRED', 'Inicia sesion para acceder a contenido +18.', 401);
  const profile = await prisma.userProfile.findUnique({
    where: { userId: claims.userId },
    select: { adultConfirmedAt: true },
  });
  if (!profile?.adultConfirmedAt) {
    throw new AppError('ADULT_CONFIRMATION_REQUIRED', 'Confirma que eres mayor de 18 anos para continuar.', 403);
  }
}

export function registerStoryRoutes(app: FastifyInstance): void {
  app.get('/v1/stories/filters', async (_request, reply) => {
    reply.header('Cache-Control', 'public, max-age=300, must-revalidate');
    return { data: storyTaxonomyResponse() };
  });

  app.get('/v1/stories/featured', async (_request, reply) => {
    reply.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return { data: await storyRepository.getFeaturedStory() };
  });

  app.get('/v1/stories', async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    reply.header('Cache-Control', 'public, max-age=0, must-revalidate');
    return storyRepository.getStories(query);
  });

  app.get<{ Params: { storyId: string } }>('/v1/stories/:storyId', async (request, reply) => {
    const story = await storyRepository.getStoryById(request.params.storyId);
    if (!story) {
      throw new AppError('STORY_NOT_FOUND', 'No se encontró la obra.', 404);
    }
    reply.header('Cache-Control', 'public, max-age=0, must-revalidate');
    return { data: story };
  });

  app.get<{ Params: { storyId: string }; Querystring: { format?: string } }>(
    '/v1/stories/:storyId/download',
    async (request, reply) => {
      await requireAdultAccess(request, request.params.storyId);
      const query = storyDownloadQuerySchema.parse(request.query);
      const story = await storyRepository.getStoryById(request.params.storyId);
      if (!story) {
        throw new AppError('STORY_NOT_FOUND', 'No se encontro la obra.', 404);
      }
      const chapters = (await Promise.all(story.chapters.map(async (summary) => {
        const chapter = await storyRepository.getChapterById(story.id, summary.id);
        if (!chapter) return null;
        const paragraphs = Array.isArray(chapter.content)
          ? chapter.content.map(String)
          : [String(chapter.content ?? '')];
        return { position: chapter.position, title: chapter.title, paragraphs } satisfies ExportChapter;
      }))).filter((chapter): chapter is ExportChapter => chapter !== null);
      if (!chapters.length) {
        throw new AppError('STORY_HAS_NO_CHAPTERS', 'La obra no tiene capitulos publicados para descargar.', 422);
      }

      const exportStory = {
        id: story.id,
        title: story.title,
        author: story.author,
        synopsis: story.synopsis,
        chapters,
      };
      const filename = safeFilename(story.title);
      if (query.format === 'pdf') {
        const pdf = await buildPdf(exportStory);
        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="${filename}.pdf"`)
          .header('Cache-Control', 'private, no-store')
          .send(pdf);
      }
      const epub = await buildEpub(exportStory);
      return reply
        .header('Content-Type', 'application/epub+zip')
        .header('Content-Disposition', `attachment; filename="${filename}.epub"`)
        .header('Cache-Control', 'private, no-store')
        .send(epub);
    },
  );

  app.get<{ Params: { storyId: string; chapterId: string } }>(
    '/v1/stories/:storyId/chapters/:chapterId',
    async (request, reply) => {
      await requireAdultAccess(request, request.params.storyId);
      const chapter = await storyRepository.getChapterById(
        request.params.storyId,
        request.params.chapterId
      );
      if (!chapter) {
        throw new AppError('CHAPTER_NOT_FOUND', 'No se encontró el capítulo.', 404);
      }
      reply.header('Cache-Control', 'public, max-age=0, must-revalidate');
      return { data: chapter };
    }
  );

  app.get<{ Params: { storyId: string; chapterId: string } }>(
    '/v1/stories/:storyId/chapters/:chapterId/download',
    async (request, reply) => {
      await requireAdultAccess(request, request.params.storyId);
      const chapter = await storyRepository.getChapterById(
        request.params.storyId,
        request.params.chapterId,
      );
      if (!chapter) {
        throw new AppError('CHAPTER_NOT_FOUND', 'No se encontro el capitulo.', 404);
      }
      const content = Array.isArray(chapter.content)
        ? chapter.content.map(String)
        : [String(chapter.content ?? '')];
      const safeTitle = safeFilename(chapter.title);
      const markdown = `# ${chapter.title}\n\n${content.join('\n\n')}\n`;
      return reply
        .header('Content-Type', 'text/markdown; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${safeTitle}.md"`)
        .header('Cache-Control', 'public, max-age=0, must-revalidate')
        .send(markdown);
    },
  );
}
