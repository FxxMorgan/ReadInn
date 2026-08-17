import type { PublicProfile, StoryDetail, StorySummary } from './types';

const apiBase = process.env.READINN_API_URL ?? 'https://api.cypher.cl';

async function readData<T>(path: string): Promise<T | null> {
  const candidates = [...new Set([apiBase, 'https://api.cypher.cl'])];
  for (const candidate of candidates) {
    try {
      const response = await fetch(`${candidate}${path}`, { next: { revalidate: 300 } });
      if (!response.ok) continue;
      const payload = await response.json() as { data?: T };
      if (payload.data !== undefined) return payload.data;
    } catch {}
  }
  return null;
}

export function getPublicStory(id: string): Promise<StoryDetail | null> {
  return readData<StoryDetail>(`/v1/stories/${encodeURIComponent(id)}`);
}

export function getPublicProfile(username: string): Promise<PublicProfile | null> {
  return readData<PublicProfile>(`/v1/users/${encodeURIComponent(username)}`);
}

export async function getPublicStories(): Promise<StorySummary[]> {
  const stories: StorySummary[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const batch = await readData<StorySummary[]>(`/v1/stories?limit=50&page=${page}&mature=exclude&sort=recent`);
    if (!batch?.length) break;
    stories.push(...batch);
    if (batch.length < 50) break;
  }
  return stories;
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
