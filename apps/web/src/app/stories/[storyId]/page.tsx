'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen, Download, Library } from 'lucide-react';
import { apiFetch, apiUrl } from '@/lib/api';
import type { StoryDetail } from '@/lib/types';

export default function StoryPage({ params }: { params: { storyId: string } }) {
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void apiFetch<StoryDetail>(`/v1/stories/${params.storyId}`).then(setStory).catch((reason) => setError(reason.message));
  }, [params.storyId]);

  if (error) return <div className="page"><div className="error-state">{error}</div></div>;
  if (!story) return <div className="page"><div className="empty-state">Cargando obra...</div></div>;

  return (
    <div className="page story-layout">
      <div className="story-cover-large" style={{ backgroundColor: story.coverColor?.startsWith('#') ? story.coverColor : '#c86643' }}>
        {story.coverColor?.startsWith('http') ? <img src={story.coverColor} alt="" /> : <BookOpen size={76} />}
      </div>
      <section>
        <span className="eyebrow">{story.genre}</span>
        <h1>{story.title}</h1>
        <p className="story-author">por <Link href={`/users/${story.authorUsername}`}>{story.author}</Link></p>
        <p className="story-synopsis">{story.synopsis}</p>
        <div className="story-actions">
          {story.chapters[0] && (
            <Link className="primary-button" href={`/stories/${story.id}/chapters/${story.chapters[0].id}`}>
              <BookOpen size={18} />Comenzar a leer
            </Link>
          )}
          <button className="secondary-button" onClick={() => void apiFetch(`/v1/library/${story.id}`, { method: 'POST' })}>
            <Library size={18} />Guardar
          </button>
        </div>
        <div className="chapter-list">
          <h2>Capitulos</h2>
          {story.chapters.map((chapter) => (
            <div className="chapter-list-row" key={chapter.id}>
              <Link href={`/stories/${story.id}/chapters/${chapter.id}`}>
                <span>{chapter.position}</span><strong>{chapter.title}</strong>
              </Link>
              <a
                className="chapter-download"
                href={apiUrl(`/v1/stories/${story.id}/chapters/${chapter.id}/download`)}
                title="Descargar capitulo"
              >
                <Download size={18} /><span className="sr-only">Descargar {chapter.title}</span>
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
