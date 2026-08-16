'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Eye, FilePlus2, PenLine, Send, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { ChapterSummary, StoryDetail } from '@/lib/types';

export default function ManageStoryPage({ params }: { params: { storyId: string } }) {
  const [story, setStory] = useState<StoryDetail | null>(null);
  const load = useCallback(async () => setStory(await apiFetch<StoryDetail>(`/v1/me/stories/${params.storyId}`)), [params.storyId]);
  useEffect(() => { void load(); }, [load]);

  async function createChapter() {
    const chapter = await apiFetch<ChapterSummary>(`/v1/stories/${params.storyId}/chapters`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Capitulo sin titulo', content: { type: 'doc', content: [{ type: 'paragraph' }] }, status: 'draft' }),
    });
    window.location.href = `/studio/${params.storyId}/chapters/${chapter.id}`;
  }

  async function deleteChapter(chapter: ChapterSummary) {
    if (!window.confirm(`Borrar "${chapter.title}"? Esta accion no se puede deshacer.`)) return;
    await apiFetch(`/v1/me/stories/${params.storyId}/chapters/${chapter.id}`, { method: 'DELETE' });
    await load();
  }

  if (!story) return <div className="page"><div className="empty-state">Cargando obra...</div></div>;
  return (
    <div className="page">
      <Link className="back-link" href="/studio"><ArrowLeft size={17} />Volver al estudio</Link>
      <div className="page-heading">
        <div><span className={`status ${story.status}`}>{story.status}</span><h1>{story.title}</h1><p>{story.synopsis}</p></div>
        <div className="heading-actions">
          {story.status === 'published' && <Link className="secondary-button" href={`/stories/${story.id}`}><Eye size={17} />Ver publicada</Link>}
          {story.status === 'draft' && <button className="secondary-button" onClick={async () => { await apiFetch(`/v1/me/stories/${story.id}/publish`, { method: 'POST' }); await load(); }}><Send size={17} />Publicar obra</button>}
          <button className="primary-button" onClick={createChapter}><FilePlus2 size={17} />Nuevo capitulo</button>
        </div>
      </div>
      <section className="chapter-manager">
        <div className="chapter-manager-head"><h2>Capitulos</h2><span>{story.chapters.length} en total</span></div>
        {story.chapters.length ? story.chapters.map((chapter) => (
          <div className="chapter-manage-row" key={chapter.id}>
            <Link className="chapter-manage-main" href={`/studio/${story.id}/chapters/${chapter.id}`}>
              <span className="chapter-position">{chapter.position}</span>
              <div><strong>{chapter.title}</strong><small>{chapter.status === 'published' ? 'Publicado' : 'Borrador'}{chapter.wordCount ? ` · ${chapter.wordCount} palabras` : ''}</small></div>
              <PenLine size={18} />
            </Link>
            <button className="chapter-delete" title="Borrar capitulo" onClick={() => void deleteChapter(chapter)}><Trash2 size={18} /><span className="sr-only">Borrar {chapter.title}</span></button>
          </div>
        )) : <div className="empty-state">Crea el primer capitulo de esta obra.</div>}
      </section>
    </div>
  );
}
