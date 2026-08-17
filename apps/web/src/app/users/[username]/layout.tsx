import type { Metadata } from 'next';
import { absoluteUrl, coverImage, getPublicProfile, jsonLd } from '@/lib/seo-api';

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const profile = await getPublicProfile(params.username);
  if (!profile) return { title: 'Perfil no encontrado' };
  const title = `${profile.displayName} (@${profile.username})`;
  const description = profile.bio?.trim() || `Descubre las obras publicadas por ${profile.displayName} en ReadInn.`;
  const image = coverImage(profile.avatarUrl ?? undefined);
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/users/${encodeURIComponent(profile.username)}`) },
    openGraph: { type: 'profile', title, description, url: absoluteUrl(`/users/${encodeURIComponent(profile.username)}`), siteName: 'ReadInn', locale: 'es_CL', images: [{ url: image, alt: `Perfil de ${profile.displayName}` }] },
    twitter: { card: 'summary', title, description, images: [image] },
  };
}

export default async function ProfileLayout({ children, params }: { children: React.ReactNode; params: { username: string } }) {
  const profile = await getPublicProfile(params.username);
  const structuredData = profile ? {
    '@context': 'https://schema.org', '@type': 'Person', name: profile.displayName,
    alternateName: `@${profile.username}`, description: profile.bio || undefined,
    image: profile.avatarUrl || undefined, url: absoluteUrl(`/users/${encodeURIComponent(profile.username)}`),
  } : null;
  return <>{structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />}{children}</>;
}
