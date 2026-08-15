'use client';

import { useEffect, useState } from 'react';
import { BookCard } from '@/components/book-card';
import { apiFetch } from '@/lib/api';
import type { StorySummary } from '@/lib/types';

export default function ExplorePage() {
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      void apiFetch<StorySummary[]>(`/v1/stories${query ? `?query=${encodeURIComponent(query)}` : ''}`)
        .then(setStories)
        .catch((reason) => setError(reason.message));
    }, 180);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="page">
      <div className="page-heading">
        <div><span className="eyebrow">Tu refugio de lectura</span><h1>Historias para quedarte</h1><p>Descubre novelas, acompana autores y guarda tus proximas lecturas.</p></div>
        <label className="search-box"><span className="sr-only">Buscar historias</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por titulo o autor" /></label>
      </div>
      {error ? <div className="error-state">{error}</div> : stories.length ? <div className="book-grid">{stories.map((story) => <BookCard key={story.id} story={story} />)}</div> : <div className="empty-state">Todavia no hay historias para mostrar.</div>}
    </div>
  );
}
