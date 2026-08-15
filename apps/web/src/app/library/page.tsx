'use client';

import { useEffect, useState } from 'react';
import { BookCard } from '@/components/book-card';
import { useAuth } from '@/components/auth-provider';
import { apiFetch } from '@/lib/api';
import type { StorySummary } from '@/lib/types';

export default function LibraryPage() {
  const { user, loading } = useAuth(); const [stories, setStories] = useState<StorySummary[]>([]);
  useEffect(() => { if (user) void apiFetch<StorySummary[]>('/v1/library').then(setStories); }, [user]);
  if (!loading && !user) return <div className="page"><div className="empty-state">Ingresa para ver tu biblioteca.</div></div>;
  return <div className="page"><div className="page-heading"><div><span className="eyebrow">Tu espacio</span><h1>Biblioteca</h1><p>Historias guardadas y lecturas para continuar.</p></div></div>{stories.length ? <div className="book-grid">{stories.map((story) => <BookCard key={story.id} story={story} />)}</div> : <div className="empty-state">Tu biblioteca esta vacia.</div>}</div>;
}
