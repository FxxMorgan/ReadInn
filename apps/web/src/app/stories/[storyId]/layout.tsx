import type { Metadata } from 'next';
import { absoluteUrl, ageLabel, coverImage, getPublicStory, jsonLd, storyDescription } from '@/lib/seo-api';

export async function generateMetadata({ params }: { params: { storyId: string } }): Promise<Metadata> {
  const story = await getPublicStory(params.storyId);
  if (!story) return { title: 'Obra no encontrada' };
  const canonical = absoluteUrl(`/stories/${story.id}`);
  const image = coverImage(story.coverColor);
  const mature = ageLabel(story) === '+18';
  return {
    title: story.title,
    description: storyDescription(story),
    alternates: { canonical },
    robots: mature ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { type: 'book', url: canonical, title: story.title, description: storyDescription(story), siteName: 'ReadInn', locale: 'es_CL', images: [{ url: image, alt: `Portada de ${story.title}` }], authors: [story.author] },
    twitter: { card: 'summary_large_image', title: story.title, description: storyDescription(story), images: [image] },
  };
}

export default async function StoryLayout({ children, params }: { children: React.ReactNode; params: { storyId: string } }) {
  const story = await getPublicStory(params.storyId);
  const structuredData = story ? {
    '@context': 'https://schema.org', '@type': 'Book', name: story.title, description: story.synopsis,
    author: { '@type': 'Person', name: story.author, url: absoluteUrl(`/users/${encodeURIComponent(story.authorUsername)}`) },
    image: coverImage(story.coverColor), url: absoluteUrl(`/stories/${story.id}`), inLanguage: story.languageCode ?? 'es',
    genre: story.genres?.length ? story.genres : [story.genre],
  } : null;
  return <>{structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />}{children}</>;
}
