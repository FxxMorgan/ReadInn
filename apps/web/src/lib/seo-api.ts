import type { PublicProfile, StoryDetail, StorySummary } from './types';

const apiBase = process.env.READINN_API_URL;

async function readData<T>(path: string): Promise<T | null> {
  if (!apiBase) throw new Error('READINN_API_URL debe estar configurada para generar metadatos SEO.');
  try {
    const response = await fetch(`${apiBase}${path}`, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    const payload = await response.json() as { data?: T };
    return payload.data ?? null;
  } catch (error) {
    console.error(`No se pudo consultar ${path} para SEO.`, error);
    return null;
  }
}

export function getPublicStory(id: string): Promise<StoryDetail | null> {
  return readData<StoryDetail>(`/v1/stories/${encodeURIComponent(id)}`);
}

export function getPublicProfile(username: string): Promise<PublicProfile | null> {
  return readData<PublicProfile>(`/v1/users/${encodeURIComponent(username)}`);
}

export async function getPublicStories(): Promise<Array<{
  id: string;
  authorUsername: string;
  updatedAt?: string;
}>> {
  return await readData<Array<{ id: string; authorUsername: string; updatedAt?: string }>>(
    '/v1/stories/sitemap',
  ) ?? [];
}

export function absoluteUrl(path: string): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://readinn.cypher.cl';
  return new URL(path, origin).toString();
}

export function coverImage(value?: string): string {
  return value?.startsWith('http') ? value : absoluteUrl('/logo.png');
}

export function ageLabel(story: StorySummary): string {
  const rating = story.ageRating ?? (story.isMature ? '18' : 'all');
  return rating === 'all' ? 'Todo público' : `+${rating}`;
}

export function storyDescription(story: StorySummary): string {
  const synopsis = story.synopsis.trim().replace(/\s+/g, ' ');
  const genres = (story.genres?.length ? story.genres : [story.genre]).slice(0, 3).join(', ');
  return `${synopsis || `Lee ${story.title} en ReadInn.`} Género: ${genres}. Clasificación: ${ageLabel(story)}.`.slice(0, 160);
}

export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
