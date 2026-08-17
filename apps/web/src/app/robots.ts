import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo-api';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/studio', '/login', '/profile', '/library', '/api/'] }],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
