import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { bearerClaims } from '../../shared/auth.js';
import { contentCache, storyCacheTags } from '../../shared/content-cache.js';
import { checkDatabaseConnection, prisma } from '../../shared/db.js';
import { AppError } from '../../shared/errors.js';
import { storyTagKind } from './story-taxonomy.js';

const chapterSchema = z.object({
  title: z.string().trim().min(1).max(150),
  content: z.union([
    z.string().min(1).max(1_000_000),
    z.array(z.string().max(100_000)).min(1).max(5_000),
  ]),
  status: z.enum(['draft', 'published']).default('published'),
}).strict();

const importedStorySchema = z.object({
  importKey: z.string().trim().min(3).max(200).regex(/^[a-z0-9][a-z0-9:._/-]+$/i),
  title: z.string().trim().min(2).max(150),
  authorName: z.string().trim().min(2).max(150),
  synopsis: z.string().trim().min(10).max(3000),
  genre: z.string().trim().min(2).max(80),
  genres: z.array(z.string().trim().min(2).max(80)).max(5).optional(),
  tags: z.array(z.string().trim().min(2).max(100)).max(20).default([]),
  sourceUrl: z.string().url().max(2048),
  license: z.string().trim().min(2).max(120),
  languageCode: z.string().trim().min(2).max(10).regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),
  coverUrl: z.string().url().max(2048).optional(),
  isMature: z.boolean().default(false),
  status: z.enum(['draft', 'published']).default('draft'),
  chapters: z.array(chapterSchema).min(1).max(200),
}).strict();

export const bulkImportSchema = z.object({
  conflictMode: z.enum(['skip', 'replace']).default('skip'),
  stories: z.array(importedStorySchema).min(1).max(20),
}).strict().superRefine((value, context) => {
  const totalChapters = value.stories.reduce((sum, story) => sum + story.chapters.length, 0);
  if (totalChapters > 500) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['stories'],
      message: 'El lote no puede contener mas de 500 capitulos.',
    });
  }
  const keys = value.stories.map((story) => story.importKey.toLowerCase());
  if (new Set(keys).size !== keys.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['stories'],
      message: 'Cada importKey debe ser unico dentro del lote.',
    });
  }
});

function slugify(value: string, fallback: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || fallback;
}

function paragraphsFrom(content: string | string[]): string[] {
  const paragraphs = (Array.isArray(content) ? content : content.split(/\r?\n\s*\r?\n/))
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (!paragraphs.length) {
    throw new AppError('EMPTY_CHAPTER', 'Un capitulo importado no puede estar vacio.', 422);
  }
  return paragraphs;
}

function chapterMetrics(plainText: string): { wordCount: number; estimatedReadMin: number } {
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  return { wordCount, estimatedReadMin: Math.max(1, Math.ceil(wordCount / 200)) };
}

async function requireAdmin(request: FastifyRequest): Promise<string> {
  const claims = bearerClaims(request.headers.authorization);
  if (!claims) throw new AppError('AUTH_REQUIRED', 'Inicia sesion para importar obras.', 401);
  if (!(await checkDatabaseConnection())) {
    throw new AppError('DATABASE_UNAVAILABLE', 'La importacion requiere PostgreSQL disponible.', 503);
  }
  const user = await prisma.user.findFirst({
    where: { id: claims.userId, accountStatus: 'active', deletedAt: null },
    select: { id: true, isAdmin: true },
  });
  if (!user) throw new AppError('AUTH_REQUIRED', 'La sesion ya no es valida.', 401);
  if (!user.isAdmin) throw new AppError('ADMIN_REQUIRED', 'Solo un administrador puede importar obras.', 403);
  return user.id;
}

async function resolveGenre(tx: Prisma.TransactionClient, name: string) {
  const existing = await tx.genre.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) return existing;
  const baseSlug = slugify(name, 'general');
  const slugCollision = await tx.genre.findUnique({ where: { slug: baseSlug } });
  const suffix = crypto.createHash('sha256').update(name).digest('hex').slice(0, 8);
  return tx.genre.create({
    data: { name, slug: slugCollision ? `${baseSlug}-${suffix}` : baseSlug },
  });
}

async function resolveTag(tx: Prisma.TransactionClient, name: string) {
  const kind = storyTagKind(name);
  if (!kind) throw new AppError('INVALID_TAG', `La etiqueta no esta en la taxonomia: ${name}`, 422);
  const existing = await tx.tag.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
  if (existing) return existing;
  const slug = slugify(name, 'tag');
  const collision = await tx.tag.findUnique({ where: { slug } });
  return tx.tag.create({ data: { name, kind, slug: collision ? `${slug}-${crypto.randomBytes(4).toString('hex')}` : slug } });
}

async function resolveAuthor(tx: Prisma.TransactionClient, authorName: string, fallbackAdminId: string): Promise<string> {
  if (!authorName || !authorName.trim()) return fallbackAdminId;
  const displayName = authorName.trim();
  const baseUsername = slugify(displayName, 'autor').replace(/-/g, '_');
  const email = `${baseUsername}@readinn.app`;

  const existing = await tx.user.findFirst({
    where: { OR: [{ username: baseUsername }, { email }] },
    select: { id: true },
  });
  if (existing) return existing.id;

  const passwordHash = crypto.createHash('sha256').update(`author_pass_${Date.now()}_${Math.random()}`).digest('hex');
  const user = await tx.user.create({
    data: {
      email,
      username: baseUsername,
      passwordHash,
      accountStatus: 'active',
      isAdmin: false,
      emailVerifiedAt: new Date(),
      writerOnboardedAt: new Date(),
      profile: {
        create: {
          displayName,
          bio: `Perfil de autor/grupo para ${displayName} en ReadInn.`,
          locale: 'es',
        },
      },
    },
    select: { id: true },
  });
  return user.id;
}

export function registerBulkImportRoutes(app: FastifyInstance): void {
  app.post('/v1/admin/stories/bulk-import', { bodyLimit: 10 * 1024 * 1024 }, async (request) => {
    const adminId = await requireAdmin(request);
    const body = bulkImportSchema.parse(request.body);

    const result = await prisma.$transaction(async (tx) => {
      const items: Array<{
        importKey: string;
        storyId: string;
        status: 'created' | 'replaced' | 'skipped';
        chapterCount: number;
      }> = [];

      for (const input of body.stories) {
        const importKey = input.importKey.toLowerCase();
        const existing = await tx.story.findUnique({
          where: { importKey },
          select: { id: true, publishedChapterCount: true },
        });
        if (existing && body.conflictMode === 'skip') {
          items.push({
            importKey,
            storyId: existing.id,
            status: 'skipped',
            chapterCount: existing.publishedChapterCount,
          });
          continue;
        }
        if (existing) await tx.story.delete({ where: { id: existing.id } });

        const genreNames = [...new Set([input.genre, ...(input.genres ?? [])])];
        const genres = await Promise.all(genreNames.map((name) => resolveGenre(tx, name)));
        const tags = await Promise.all(input.tags.map((name) => resolveTag(tx, name)));
        const authorId = await resolveAuthor(tx, input.authorName, adminId);
        const chapters = input.chapters.map((chapter, index) => {
          const paragraphs = paragraphsFrom(chapter.content);
          const plainText = paragraphs.join('\n\n');
          return {
            title: chapter.title,
            slug: `${slugify(chapter.title, 'capitulo')}-${index + 1}`,
            position: index + 1,
            status: chapter.status,
            contentJson: paragraphs,
            plainText,
            ...chapterMetrics(plainText),
            ...(chapter.status === 'published' ? { publishedAt: new Date() } : {}),
          };
        });
        const publishedChapters = chapters.filter((chapter) => chapter.status === 'published');
        const storySlugSuffix = crypto.createHash('sha256').update(importKey).digest('hex').slice(0, 10);
        const story = await tx.story.create({
          data: {
            author: { connect: { id: authorId } },
            title: input.title,
            slug: `${slugify(input.title, 'obra')}-${storySlugSuffix}`,
            synopsis: input.synopsis,
            status: input.status,
            isMature: input.isMature,
            ...(input.coverUrl ? { coverUrl: input.coverUrl } : {}),
            attributionName: input.authorName,
            sourceUrl: input.sourceUrl,
            sourceLicense: input.license,
            importKey,
            languageCode: input.languageCode,
            wordCount: publishedChapters.reduce((sum, chapter) => sum + chapter.wordCount, 0),
            publishedChapterCount: publishedChapters.length,
            ...(input.status === 'published' ? { publishedAt: new Date() } : {}),
            genres: { create: genres.map((genre) => ({ genre: { connect: { id: genre.id } } })) },
            tags: { create: tags.map((tag) => ({ tag: { connect: { id: tag.id } } })) },
            chapters: { create: chapters },
          },
          select: { id: true },
        });
        items.push({
          importKey,
          storyId: story.id,
          status: existing ? 'replaced' : 'created',
          chapterCount: chapters.length,
        });
      }
      return items;
    }, { maxWait: 10_000, timeout: 120_000 });

    await contentCache.invalidateTags([
      'catalog',
      ...result.flatMap((item) => storyCacheTags(item.storyId)),
    ]);
    return {
      data: {
        created: result.filter((item) => item.status === 'created').length,
        replaced: result.filter((item) => item.status === 'replaced').length,
        skipped: result.filter((item) => item.status === 'skipped').length,
        items: result,
      },
    };
  });
}
