import type { Metadata } from 'next';
import ExplorePage from '@/components/explore-page';

export const metadata: Metadata = {
  title: 'ReadInn: Tu Refugio de Lectura',
  description: 'Descubre novelas e historias por género, sigue a tus autores favoritos y publica tus propias obras en ReadInn.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return <ExplorePage />;
}
