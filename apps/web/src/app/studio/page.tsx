'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArchiveRestore, BookOpen, FilePlus2, PenLine, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { apiFetch } from '@/lib/api';
import type { StorySummary } from '@/lib/types';

export default function StudioPage() {
  const { user, loading } = useAuth();
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'active' | 'archived'>('active');

  const load = useCallback(async () => {
    const items = await apiFetch<StorySummary[]>(`/v1/me/stories?includeArchived=${filter === 'archived'}`);
    setStories(items.filter((story) => filter === 'archived' ? story.status === 'archived' : story.status !== 'archived'));
  }, [filter]);

  useEffect(() => { if (user) void load(); }, [load, user]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const story = await apiFetch<StorySummary>('/v1/stories', {
      method: 'POST',
      body: JSON.stringify({
        title: data.get('title'), synopsis: data.get('synopsis'), genre: data.get('genre'),
        isMature: data.get('isMature') === 'on', coverColor: '#c86643', status: 'draft',
      }),
    });
    setShowCreate(false);
    window.location.href = `/studio/${story.id}`;
  }

  if (!loading && !user) return <div className="page"><div className="empty-state">Ingresa para abrir tu estudio de autor.</div></div>;

  return (
    <div className="page">
      <div className="page-heading">
        <div><span className="eyebrow">Escritorio de creador</span><h1>Tus historias</h1><p>Escribe con calma, guarda borradores y publica cuando tu capitulo este listo.</p></div>
        <button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={18} />Nueva obra</button>
      </div>
      <div className="studio-filters">
        <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>En curso</button>
        <button className={filter === 'archived' ? 'active' : ''} onClick={() => setFilter('archived')}>Archivadas</button>
      </div>
      {stories.length ? (
        <div className="studio-grid">
          {stories.map((story) => (
            <article className="studio-card" key={story.id}>
              <div className="studio-cover" style={{ backgroundColor: story.coverColor?.startsWith('#') ? story.coverColor : '#c86643' }}><BookOpen /></div>
              <div>
                <span className={`status ${story.status}`}>{story.status === 'draft' ? 'Borrador' : story.status === 'archived' ? 'Archivada' : 'Publicada'}</span>
                <h2>{story.title}</h2><p>{story.synopsis}</p>
                <div className="studio-card-meta"><span>{story.chapterCount} capitulos</span><Link href={`/studio/${story.id}`}><PenLine size={16} />Administrar</Link></div>
              </div>
              {story.status === 'archived' ? (
                <button className="card-corner" title="Restaurar" onClick={async () => { await apiFetch(`/v1/me/stories/${story.id}/restore`, { method: 'POST' }); await load(); }}><ArchiveRestore size={18} /></button>
              ) : (
                <button className="card-corner" title="Archivar" onClick={async () => { if (confirm('Archivar esta obra? Podras restaurarla despues.')) { await apiFetch(`/v1/me/stories/${story.id}`, { method: 'DELETE' }); await load(); } }}><Trash2 size={18} /></button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state"><div><FilePlus2 size={40} /><h2>{filter === 'archived' ? 'No tienes obras archivadas' : 'Tu proxima historia empieza aqui'}</h2><p>Crea una obra y trabaja sus capitulos como borradores.</p></div></div>
      )}
      {showCreate && (
        <div className="modal-backdrop">
          <form className="modal-card" onSubmit={create}>
            <h2>Nueva obra</h2>
            <div className="field"><label>Titulo</label><input name="title" required minLength={2} /></div>
            <div className="field"><label>Sinopsis</label><textarea name="synopsis" required minLength={10} /></div>
            <div className="field"><label>Genero</label><select name="genre"><option>Misterio</option><option>Fantasia</option><option>Romance</option><option>Ciencia ficcion</option><option>Terror</option><option>Drama</option></select></div>
            <label className="check-field"><input name="isMature" type="checkbox" />Contenido para adultos</label>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>Cancelar</button><button className="primary-button">Crear borrador</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
