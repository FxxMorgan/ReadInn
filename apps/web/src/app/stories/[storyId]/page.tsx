'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookDown, BookOpen, Download, Library } from 'lucide-react';
import { apiFetch, apiUrl } from '@/lib/api';
import { getOfflineItem, hasOfflineItem, putOfflineItem } from '@/lib/offline-library';
import type { StoryDetail } from '@/lib/types';
import { useAuth } from '@/components/auth-provider';

export default function StoryPage({ params }: { params: { storyId: string } }) {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [error, setError] = useState('');
  const [offlineSaving, setOfflineSaving] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const storyCacheKey = `readinn-offline-story:${params.storyId}`;

  async function allowAdultAccess(): Promise<boolean> {
    if ((story?.ageRating ?? (story?.isMature ? '18' : 'all')) !== '18') return true;
    if (!user || user.id === 'user-guest') {
      router.push(`/login?next=${encodeURIComponent(`/stories/${params.storyId}`)}`);
      return false;
    }
    if (user.adultConfirmed) return true;
    if (!window.confirm('Esta obra es +18. Confirma que eres mayor de 18 años para continuar.')) return false;
    await apiFetch('/v1/auth/me/adult-confirmation', {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
    await refresh();
    return true;
  }

  async function openProtected(path: string) {
    try {
      if (await allowAdultAccess()) router.push(path);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos confirmar tu edad.');
    }
  }

  async function downloadProtected(path: string) {
    try {
      if (await allowAdultAccess()) window.location.assign(apiUrl(path));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos confirmar tu edad.');
    }
  }
  useEffect(() => {
    void hasOfflineItem(storyCacheKey).then(setOfflineSaved);
    void apiFetch<StoryDetail>(`/v1/stories/${params.storyId}`)
      .then(setStory)
      .catch((reason) => {
        void getOfflineItem<StoryDetail>(storyCacheKey).then((cached) => {
          if (cached) setStory(cached);
          else setError(reason.message);
        });
      });
  }, [params.storyId]);

  async function saveOffline() {
    if (!story || offlineSaving) return;
    if (!(await allowAdultAccess())) return;
    setOfflineSaving(true);
    setError('');
    try {
      const chapterPages = await Promise.all(story.chapters.map(async (chapter) => {
        const detail = await apiFetch(`/v1/stories/${story.id}/chapters/${chapter.id}`);
        await putOfflineItem(`readinn-offline-chapter:${story.id}:${chapter.id}`, detail);
        return `/stories/${story.id}/chapters/${chapter.id}`;
      }));
      await putOfflineItem(storyCacheKey, story);
      if ('caches' in window) {
        const cache = await caches.open('readinn-offline-v1');
        await Promise.allSettled([`/stories/${story.id}`, ...chapterPages].map((path) => cache.add(path)));
      }
      setOfflineSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos guardar la obra sin conexion.');
    } finally {
      setOfflineSaving(false);
    }
  }

  if (error) return <div className="page"><div className="error-state">{error}</div></div>;
  if (!story) return <div className="page"><div className="empty-state">Cargando obra...</div></div>;

  return (
    <div className="page story-layout">
      <div className="story-cover-large" style={{ backgroundColor: story.coverColor?.startsWith('#') ? story.coverColor : '#c86643' }}>
        {story.coverColor?.startsWith('http') ? <img src={story.coverColor} alt="" /> : <BookOpen size={76} />}
      </div>
      <section>
        <span className="eyebrow">{story.genre} · {(story.ageRating ?? (story.isMature ? '18' : 'all')) === 'all' ? 'Todo público' : `+${story.ageRating ?? '18'}`}</span>
        <span className={`origin-badge ${story.creationMethod ?? 'human'}`}>
          {story.creationMethod === 'ai_generated'
            ? 'Generada por IA'
            : story.creationMethod === 'ai_assisted'
              ? 'Asistida por IA'
              : 'Creada por autor'}
        </span>
        <h1>{story.title}</h1>
        <p className="story-author">por <Link href={`/users/${story.authorUsername}`}>{story.author}</Link></p>
        <p className="story-synopsis">{story.synopsis}</p>
        <div className="story-actions">
          {story.chapters[0] && (
            <button className="primary-button" onClick={() => void openProtected(`/stories/${story.id}/chapters/${story.chapters[0].id}`)}>
              <BookOpen size={18} />Comenzar a leer
            </button>
          )}
          <button className="secondary-button" onClick={() => void apiFetch(`/v1/library/${story.id}`, { method: 'POST' })}>
            <Library size={18} />Guardar
          </button>
          <button className="secondary-button" disabled={offlineSaving} onClick={() => void saveOffline()}>
            <BookDown size={18} />{offlineSaving ? 'Guardando...' : offlineSaved ? 'Disponible sin conexion' : 'Guardar sin conexion'}
          </button>
          <details className="story-export-menu">
            <summary className="secondary-button"><Download size={18} />Exportar</summary>
            <div>
              <button onClick={() => void downloadProtected(`/v1/stories/${story.id}/download?format=epub`)}>EPUB</button>
              <button onClick={() => void downloadProtected(`/v1/stories/${story.id}/download?format=pdf`)}>PDF</button>
            </div>
          </details>
        </div>
        <div className="chapter-list">
          <h2>Capitulos</h2>
          {story.chapters.map((chapter) => (
            <div className="chapter-list-row" key={chapter.id}>
              <button className="chapter-link-button" onClick={() => void openProtected(`/stories/${story.id}/chapters/${chapter.id}`)}>
                <span>{chapter.position}</span><strong>{chapter.title}</strong>
              </button>
              <button
                className="chapter-download"
                onClick={() => void downloadProtected(`/v1/stories/${story.id}/chapters/${chapter.id}/download`)}
                title="Descargar capitulo"
              >
                <Download size={18} /><span className="sr-only">Descargar {chapter.title}</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
