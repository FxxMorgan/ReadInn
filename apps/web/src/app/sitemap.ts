import type { MetadataRoute } from 'next';
import { absoluteUrl, getPublicStories } from '@/lib/seo-api';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stories = await getPublicStories();
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
  ];
  const seenProfiles = new Set<string>();

  for (const story of stories) {
    entries.push({ url: absoluteUrl(`/stories/${story.id}`), changeFrequency: 'weekly', priority: 0.8, ...(story.updatedAt ? { lastModified: new Date(story.updatedAt) } : {}) });
    if (!seenProfiles.has(story.authorUsername)) {
      seenProfiles.add(story.authorUsername);
      entries.push({ url: absoluteUrl(`/users/${encodeURIComponent(story.authorUsername)}`), changeFrequency: 'weekly', priority: 0.5 });
    }
  }
  return entries;
}
