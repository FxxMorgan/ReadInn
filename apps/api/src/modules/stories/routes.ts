import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../shared/errors.js';
import { storyRepository } from './story-repository.js';
import { buildEpub, buildPdf, type ExportChapter } from './story-export.js';

const listQuerySchema = z.object({
  query: z.string().trim().max(100).optional(),
  genre: z.string().trim().max(50).optional(),
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

export function registerStoryRoutes(app: FastifyInstance): void {
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
