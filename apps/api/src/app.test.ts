import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { loadConfig } from './config/env.js';
import { accessToken } from './shared/auth.js';

const config = loadConfig({
  NODE_ENV: 'test',
  APP_WEB_URL: 'http://localhost:8080',
  LOG_LEVEL: 'silent'
});

describe('ReadInn API', () => {
  it('reports liveness', async () => {
    const app = await buildApp(config);
    const response = await app.inject({ method: 'GET', url: '/health/live' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { status: 'ok' } });
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
});
