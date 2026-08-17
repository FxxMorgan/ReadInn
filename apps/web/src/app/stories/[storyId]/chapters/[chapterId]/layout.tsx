import type { Metadata } from 'next';
import { absoluteUrl, ageLabel, coverImage, getPublicStory, jsonLd } from '@/lib/seo-api';

export async function generateMetadata({ params }: { params: { storyId: string; chapterId: string } }): Promise<Metadata> {
  const story = await getPublicStory(params.storyId);
  const chapter = story?.chapters.find((item) => item.id === params.chapterId);
  if (!story || !chapter) return { title: 'Capítulo no encontrado' };
  const title = `${chapter.title} - ${story.title}`;
  const description = `Lee ${chapter.title} de ${story.title} en ReadInn, por ${story.author}.`;
  const mature = ageLabel(story) === '+18';
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/stories/${story.id}/chapters/${chapter.id}`) },
    robots: mature ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { type: 'article', title, description, url: absoluteUrl(`/stories/${story.id}/chapters/${chapter.id}`), siteName: 'ReadInn', locale: 'es_CL', images: [{ url: coverImage(story.coverColor), alt: `Portada de ${story.title}` }] },
    twitter: { card: 'summary_large_image', title, description, images: [coverImage(story.coverColor)] },
  };
}

export default async function ChapterLayout({ children, params }: { children: React.ReactNode; params: { storyId: string; chapterId: string } }) {
  const story = await getPublicStory(params.storyId);
  const chapter = story?.chapters.find((item) => item.id === params.chapterId);
  const structuredData = story && chapter ? {
    '@context': 'https://schema.org', '@type': 'Chapter', name: chapter.title, position: chapter.position,
    isPartOf: { '@type': 'Book', name: story.title, url: absoluteUrl(`/stories/${story.id}`) },
    author: { '@type': 'Person', name: story.author },
    url: absoluteUrl(`/stories/${story.id}/chapters/${chapter.id}`), inLanguage: story.languageCode ?? 'es',
  } : null;
  return <>{structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />}{children}</>;
}
