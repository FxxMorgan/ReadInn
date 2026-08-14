import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { loadConfig } from './config/env.js';

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
});
