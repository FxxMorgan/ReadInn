import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildApp } from './app.js';
import { loadConfig } from './config/env.js';
import { accessToken } from './shared/auth.js';
import { s3MediaService } from './modules/media/s3-storage.js';

vi.mock('./shared/db.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./shared/db.js')>();
  return { ...original, checkDatabaseConnection: async () => false };
});

const config = loadConfig({
  NODE_ENV: 'test',
  APP_WEB_URL: 'http://localhost:8080',
  LOG_LEVEL: 'silent',
  CACHE_ENABLED: 'false',
});

describe('ReadInn API', () => {
  it('reports liveness', async () => {
    const app = await buildApp(config);
    const response = await app.inject({ method: 'GET', url: '/health/live' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { status: 'ok' } });
    await app.close();
  });

  it('normalizes registered usernames while preserving the display name', async () => {
    const app = await buildApp(config);
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'feer-normalization@example.com',
        username: 'Feer',
        password: 'password-123',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json<{ data: { user: { username: string; displayName: string } } }>().data.user).toMatchObject({
      username: 'feer',
      displayName: 'Feer',
    });
    await app.close();
  });

  it('uploads media through the API before confirming it', async () => {
    const uploadSpy = vi.spyOn(s3MediaService, 'uploadObject').mockResolvedValue();
    const app = await buildApp(config);
    const intentResponse = await app.inject({
      method: 'POST',
      url: '/v1/media/upload-intent',
      payload: {
        filename: 'cover.png',
        mimeType: 'image/png',
        sizeBytes: 4,
        purpose: 'cover',
      },
    });
    const intent = intentResponse.json<{ data: { mediaId: string; uploadPath: string } }>().data;
    const uploadResponse = await app.inject({
      method: 'PUT',
      url: intent.uploadPath,
      headers: { 'content-type': 'image/png' },
      payload: Buffer.from([1, 2, 3, 4]),
    });
    const confirmation = await app.inject({
      method: 'POST',
      url: `/v1/media/${intent.mediaId}/confirm`,
    });

    expect(intentResponse.statusCode).toBe(201);
    expect(uploadResponse.statusCode).toBe(204);
    expect(uploadSpy).toHaveBeenCalledOnce();
    expect(confirmation.statusCode).toBe(200);
    expect(confirmation.json<{ data: { status: string } }>().data.status).toBe('ready');
    uploadSpy.mockRestore();
    await app.close();
  });

  it('lists fixture stories with pagination metadata', async () => {
    const app = await buildApp(config);
    const response = await app.inject({ method: 'GET', url: '/v1/stories?limit=1' });
    const body = response.json<{
      data: unknown[];
      meta: { total: number; totalPages: number };
    }>();

    expect(response.statusCode).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta.total).toBe(2);
    expect(body.meta.totalPages).toBe(2);
    await app.close();
  });

  it('returns a chapter and a typed not-found error', async () => {
    const app = await buildApp(config);
    const chapterResponse = await app.inject({
      method: 'GET',
      url: '/v1/stories/story-lighthouse/chapters/chapter-lighthouse-1'
    });
    const missingResponse = await app.inject({
      method: 'GET',
      url: '/v1/stories/story-lighthouse/chapters/missing'
    });

    expect(chapterResponse.statusCode).toBe(200);
    const chapterBody = chapterResponse.json<{ data: { content: string[] } }>();
    const missingBody = missingResponse.json<{ error: { code: string } }>();

    expect(chapterBody.data.content).toHaveLength(4);
    expect(missingResponse.statusCode).toBe(404);
    expect(missingBody.error.code).toBe('CHAPTER_NOT_FOUND');
    await app.close();
  });

  it('downloads a published chapter as Markdown', async () => {
    const app = await buildApp(config);
    const response = await app.inject({
      method: 'GET',
      url: '/v1/stories/story-lighthouse/chapters/chapter-lighthouse-1/download',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/markdown');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.body).toContain('# El mapa bajo la sal');
    await app.close();
  });

  it('exports a published story as EPUB and PDF', async () => {
    const app = await buildApp(config);
    const epub = await app.inject({
      method: 'GET',
      url: '/v1/stories/story-lighthouse/download?format=epub',
    });
    const pdf = await app.inject({
      method: 'GET',
      url: '/v1/stories/story-lighthouse/download?format=pdf',
    });

    expect(epub.statusCode).toBe(200);
    expect(epub.headers['content-type']).toContain('application/epub+zip');
    expect(epub.rawPayload.subarray(0, 2).toString()).toBe('PK');
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(pdf.rawPayload.subarray(0, 4).toString()).toBe('%PDF');
    await app.close();
  });

  it('lists and creates chapter comments', async () => {
    const app = await buildApp(config);
    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/stories/story-lighthouse/chapters/chapter-lighthouse-1/comments',
      payload: { body: 'El mapa tiene una atmosfera increible.', authorName: 'Lector' },
    });
    const listResponse = await app.inject({
      method: 'GET',
      url: '/v1/stories/story-lighthouse/chapters/chapter-lighthouse-1/comments',
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json<{ data: { body: string } }>().data.body).toBe(
      'El mapa tiene una atmosfera increible.'
    );
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json<{ data: unknown[] }>().data.length).toBeGreaterThan(0);
    await app.close();
  });

  it('supports replies, voting, and revealing comments hidden by negativity', async () => {
    const app = await buildApp(config);
    const create = await app.inject({
      method: 'POST',
      url: '/v1/stories/story-lighthouse/chapters/chapter-lighthouse-1/comments',
      payload: { body: 'Este comentario iniciara un hilo.', authorName: 'Autor del hilo' },
    });
    const parent = create.json<{ data: { id: string } }>().data;
    const reply = await app.inject({
      method: 'POST',
      url: '/v1/stories/story-lighthouse/chapters/chapter-lighthouse-1/comments',
      payload: {
        body: 'Esta es una respuesta directa.',
        authorName: 'Respuesta',
        parentCommentId: parent.id,
      },
    });
    expect(reply.statusCode).toBe(201);
    expect(reply.json<{ data: { parentCommentId: string } }>().data.parentCommentId).toBe(parent.id);

    for (let index = 1; index <= 3; index += 1) {
      const token = accessToken(`negative-reader-${index}`, `negative-${index}@example.com`);
      const vote = await app.inject({
        method: 'POST',
        url: `/v1/stories/story-lighthouse/chapters/chapter-lighthouse-1/comments/${parent.id}/vote`,
        headers: { authorization: `Bearer ${token}` },
        payload: { value: -1 },
      });
      expect(vote.statusCode).toBe(200);
    }

    const hidden = await app.inject({
      method: 'GET',
      url: '/v1/stories/story-lighthouse/chapters/chapter-lighthouse-1/comments',
    });
    const hiddenComment = hidden.json<{ data: Array<{ id: string; body: string; isHidden: boolean }> }>()
      .data.find((comment) => comment.id === parent.id);
    expect(hiddenComment).toMatchObject({
      body: 'Comentario oculto por negatividad',
      isHidden: true,
    });

    const revealed = await app.inject({
      method: 'GET',
      url: '/v1/stories/story-lighthouse/chapters/chapter-lighthouse-1/comments?includeHidden=true',
    });
    const revealedComment = revealed.json<{ data: Array<{ id: string; body: string }> }>()
      .data.find((comment) => comment.id === parent.id);
    expect(revealedComment?.body).toBe('Este comentario iniciara un hilo.');
    await app.close();
  });

  it('updates the avatar URL in the profile contract', async () => {
    const app = await buildApp(config);
    const token = accessToken('avatar-reader', 'avatar@example.com');
    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        displayName: 'Avatar Reader',
        bio: 'Perfil con imagen.',
        avatarUrl: 'https://read.cypher.cl/avatars/avatar-reader.webp',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ data: { avatarUrl: string } }>().data.avatarUrl).toContain('/avatars/');
    await app.close();
  });

  it('returns truthful zero metrics and the real rating average', async () => {
    const app = await buildApp(config);
    const token = accessToken('user-metrics-reader', 'metrics@example.com');
    const headers = { authorization: `Bearer ${token}` };

    const metrics = await app.inject({
      method: 'GET',
      url: '/v1/dashboard/metrics',
      headers,
    });
    expect(metrics.statusCode).toBe(200);
    expect(metrics.json<{ data: { summary: { totalViews: number; uniqueReaders: number; avgReadMinutes: number } } }>().data.summary).toMatchObject({
      totalViews: 0,
      uniqueReaders: 0,
      avgReadMinutes: 0,
    });

    expect((await app.inject({
      method: 'POST',
      url: '/v1/stories/story-lighthouse/rating',
      headers,
      payload: { rating: 5 },
    })).statusCode).toBe(200);
    const engagement = await app.inject({
      method: 'GET',
      url: '/v1/stories/story-lighthouse/engagement',
      headers,
    });
    expect(engagement.statusCode).toBe(200);
    expect(engagement.json<{ data: { averageRating: number; ratingCount: number; userRating: number } }>().data).toMatchObject({
      averageRating: 5,
      ratingCount: 1,
      userRating: 5,
    });

    await app.close();
  });

  it('opens public profiles, follows authors, and writes on their wall', async () => {
    const app = await buildApp(config);
    const token = accessToken('user-social-reader', 'social-reader@example.com');
    const headers = { authorization: `Bearer ${token}` };

    const profile = await app.inject({
      method: 'GET',
      url: '/v1/users/marina-solis',
      headers,
    });
    expect(profile.statusCode).toBe(200);
    expect(profile.json<{ data: { stories: unknown[] } }>().data.stories.length).toBeGreaterThan(0);

    const follow = await app.inject({
      method: 'POST',
      url: '/v1/users/marina-solis/follow',
      headers,
    });
    expect(follow.statusCode).toBe(200);
    expect(follow.json<{ data: { following: boolean } }>().data.following).toBe(true);

    const post = await app.inject({
      method: 'POST',
      url: '/v1/users/marina-solis/wall',
      headers,
      payload: { body: 'Espero con ganas el siguiente capitulo.' },
    });
    expect(post.statusCode).toBe(201);
    const wall = await app.inject({ method: 'GET', url: '/v1/users/marina-solis/wall' });
    expect(wall.statusCode).toBe(200);
    expect(wall.json<{ data: Array<{ body: string }> }>().data[0]?.body).toBe(
      'Espero con ganas el siguiente capitulo.',
    );
    await app.close();
  });

  it('keeps writer drafts private until publishing and supports archive restore', async () => {
    const app = await buildApp(config);
    const token = accessToken('user-web-writer', 'writer@example.com');
    const headers = { authorization: `Bearer ${token}` };
    const createStory = await app.inject({
      method: 'POST', url: '/v1/stories', headers,
      payload: { title: 'Novela web', synopsis: 'Una historia creada desde el estudio web.', genre: 'Drama', status: 'draft' },
    });
    expect(createStory.statusCode).toBe(201);
    const story = createStory.json<{ data: { id: string; title: string } }>().data;
    const privateDraft = await app.inject({
      method: 'GET',
      url: `/v1/me/stories/${story.id}`,
      headers,
    });
    expect(privateDraft.statusCode).toBe(200);
    expect(privateDraft.json<{ data: { title: string } }>().data.title).toBe(story.title);
    const publicBefore = await app.inject({ method: 'GET', url: `/v1/stories/${story.id}` });
    expect(publicBefore.statusCode).toBe(404);

    const createChapter = await app.inject({
      method: 'POST', url: `/v1/stories/${story.id}/chapters`, headers,
      payload: { title: 'Primer capitulo', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Inicio' }] }] }, status: 'draft' },
    });
    expect(createChapter.statusCode).toBe(201);
    const chapter = createChapter.json<{ data: { id: string; contentVersion: number } }>().data;
    const save = await app.inject({
      method: 'PATCH', url: `/v1/me/stories/${story.id}/chapters/${chapter.id}`, headers,
      payload: { title: 'Primer capitulo editado', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto guardado' }] }] }, plainText: 'Texto guardado', expectedVersion: chapter.contentVersion },
    });
    expect(save.statusCode).toBe(200);

    expect((await app.inject({ method: 'POST', url: `/v1/me/stories/${story.id}/chapters/${chapter.id}/publish`, headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `/v1/me/stories/${story.id}/publish`, headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/v1/stories/${story.id}` })).statusCode).toBe(200);
    expect((await app.inject({ method: 'DELETE', url: `/v1/me/stories/${story.id}/chapters/${chapter.id}`, headers })).statusCode).toBe(200);
    const afterDelete = await app.inject({ method: 'GET', url: `/v1/stories/${story.id}` });
    expect(afterDelete.statusCode).toBe(200);
    expect(afterDelete.json<{ data: { chapters: unknown[] } }>().data.chapters).toHaveLength(0);
    expect((await app.inject({ method: 'DELETE', url: `/v1/me/stories/${story.id}`, headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/v1/stories/${story.id}` })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: `/v1/me/stories/${story.id}/restore`, headers })).statusCode).toBe(200);
    await app.close();
  });

  it('publishes mobile stories explicitly and validates the synopsis', async () => {
    const app = await buildApp(config);
    const token = accessToken('user-mobile-writer', 'mobile@example.com');
    const headers = { authorization: `Bearer ${token}` };

    const invalid = await app.inject({
      method: 'POST',
      url: '/v1/stories',
      headers,
      payload: { title: 'No', synopsis: 'Muy corta', genre: 'Drama' },
    });
    expect(invalid.statusCode).toBe(422);

    const created = await app.inject({
      method: 'POST',
      url: '/v1/stories',
      headers,
      payload: {
        title: 'Historia movil',
        synopsis: 'Una historia publicada directamente desde el telefono.',
        genre: 'Drama',
        status: 'published',
      },
    });
    expect(created.statusCode).toBe(201);
    const story = created.json<{ data: { id: string; status: string } }>().data;
    expect(story.status).toBe('published');
    expect((await app.inject({ method: 'GET', url: `/v1/stories/${story.id}` })).statusCode).toBe(200);

    await app.close();
  });

  it('caches book content on disk and invalidates it after an author edit', async () => {
    const cacheDir = await mkdtemp(path.join(tmpdir(), 'readinn-cache-'));
    const cacheConfig = loadConfig({
      NODE_ENV: 'test',
      APP_WEB_URL: 'http://localhost:8080',
      LOG_LEVEL: 'silent',
      CACHE_ENABLED: 'true',
      CACHE_DIR: cacheDir,
      CACHE_TTL_SECONDS: '900',
    });
    const app = await buildApp(cacheConfig);
    try {
      const token = accessToken('user-cache-writer', 'cache@example.com');
      const headers = { authorization: `Bearer ${token}` };
      const createdStory = await app.inject({
        method: 'POST',
        url: '/v1/stories',
        headers,
        payload: {
          title: 'Historia cacheada',
          synopsis: 'Una historia para verificar la invalidacion del cache.',
          genre: 'Drama',
          status: 'draft',
        },
      });
      const story = createdStory.json<{ data: { id: string } }>().data;
      const createdChapter = await app.inject({
        method: 'POST',
        url: `/v1/stories/${story.id}/chapters`,
        headers,
        payload: { title: 'Titulo inicial', content: ['Texto inicial'], status: 'draft' },
      });
      const chapter = createdChapter.json<{ data: { id: string; contentVersion: number } }>().data;
      await app.inject({ method: 'POST', url: `/v1/me/stories/${story.id}/chapters/${chapter.id}/publish`, headers });
      await app.inject({ method: 'POST', url: `/v1/me/stories/${story.id}/publish`, headers });
      await app.inject({ method: 'GET', url: `/v1/stories/${story.id}` });
      expect((await readdir(cacheDir)).some((file) => file.endsWith('.json'))).toBe(true);

      await app.inject({
        method: 'PATCH',
        url: `/v1/me/stories/${story.id}/chapters/${chapter.id}`,
        headers,
        payload: {
          title: 'Titulo actualizado',
          content: ['Texto actualizado'],
          plainText: 'Texto actualizado',
          expectedVersion: chapter.contentVersion,
        },
      });
      const refreshed = await app.inject({ method: 'GET', url: `/v1/stories/${story.id}` });
      expect(refreshed.json<{ data: { chapters: Array<{ title: string }> } }>().data.chapters[0]?.title).toBe(
        'Titulo actualizado',
      );
    } finally {
      await app.close();
      await rm(cacheDir, { recursive: true, force: true });
    }
  });
});
