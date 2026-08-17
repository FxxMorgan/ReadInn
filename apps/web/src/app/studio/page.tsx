'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ArchiveRestore, BookOpen, FilePlus2, ImagePlus, PenLine, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { CoverCropDialog } from '@/components/cover-crop-dialog';
import { apiFetch, apiUrl } from '@/lib/api';
import type { StorySummary, StoryTaxonomy } from '@/lib/types';

export default function StudioPage() {
  const { user, loading } = useAuth();
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'active' | 'archived'>('active');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverCrop, setCoverCrop] = useState<{ source: string; filename: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [taxonomy, setTaxonomy] = useState<StoryTaxonomy | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Misterio']);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ageRating, setAgeRating] = useState<'all' | '11' | '13' | '16' | '18'>('all');
  const coverInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const items = await apiFetch<StorySummary[]>(`/v1/me/stories?includeArchived=${filter === 'archived'}`);
    setStories(items.filter((story) => filter === 'archived' ? story.status === 'archived' : story.status !== 'archived'));
  }, [filter]);

  useEffect(() => { if (user) void load(); }, [load, user]);
  useEffect(() => { void apiFetch<StoryTaxonomy>('/v1/stories/filters').then(setTaxonomy).catch(() => undefined); }, []);
  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);

  function closeCreate() {
    if (coverCrop) URL.revokeObjectURL(coverCrop.source);
    setShowCreate(false);
    setCoverFile(null);
    setCoverPreview(null);
    setCoverCrop(null);
    setCreateError('');
    setSelectedGenres(['Misterio']);
    setSelectedTags([]);
    setAgeRating('all');
  }

  function selectCover(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setCreateError('La portada debe ser JPG, PNG, WebP o GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCreateError('La portada no puede pesar mas de 5 MB.');
      return;
    }
    setCreateError('');
    setCoverCrop({ source: URL.createObjectURL(file), filename: file.name });
  }

  function cancelCoverCrop() {
    if (coverCrop) URL.revokeObjectURL(coverCrop.source);
    setCoverCrop(null);
  }

  function applyCoverCrop(file: File) {
    if (coverCrop) URL.revokeObjectURL(coverCrop.source);
    setCoverCrop(null);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function uploadCover(file: File): Promise<string> {
    const intent = await apiFetch<{ mediaId: string; uploadPath: string }>('/v1/media/upload-intent', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, mimeType: file.type, sizeBytes: file.size, purpose: 'cover' }),
    });
    const upload = await fetch(apiUrl(intent.uploadPath), { method: 'PUT', credentials: 'include', headers: { 'Content-Type': file.type }, body: file });
    if (!upload.ok) throw new Error('No pudimos subir la portada.');
    const confirmed = await apiFetch<{ publicUrl: string }>(`/v1/media/${intent.mediaId}/confirm`, { method: 'POST' });
    return confirmed.publicUrl;
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      if (!selectedGenres.length) throw new Error('Selecciona al menos un genero.');
      const data = new FormData(event.currentTarget);
      const coverColor = coverFile ? await uploadCover(coverFile) : undefined;
      const story = await apiFetch<StorySummary>('/v1/stories', {
        method: 'POST',
        body: JSON.stringify({
          title: data.get('title'), synopsis: data.get('synopsis'), genres: selectedGenres, tags: selectedTags, ageRating,
          isMature: data.get('isMature') === 'on', status: 'draft', coverColor,
        }),
      });
      window.location.href = `/studio/${story.id}`;
    } catch (error) {
      setCreating(false);
      setCreateError(error instanceof Error ? error.message : 'No pudimos crear la obra.');
    }
  }

  if (!loading && !user) return <div className="page"><div className="empty-state">Ingresa para abrir tu estudio de autor.</div></div>;

  return (
    <div className="page">
      <div className="page-heading">
        <div><span className="eyebrow">{user?.isAdmin ? 'Administracion' : 'Escritorio de creador'}</span><h1>{user?.isAdmin ? 'Todas las historias' : 'Tus historias'}</h1><p>{user?.isAdmin ? 'Revisa y administra las obras publicadas por toda la comunidad.' : 'Escribe con calma, guarda borradores y publica cuando tu capitulo este listo.'}</p></div>
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
              <div className="studio-cover" style={{ backgroundColor: story.coverColor?.startsWith('#') ? story.coverColor : '#c86643' }}>
                {story.coverColor?.startsWith('http') ? <img src={story.coverColor} alt={`Portada de ${story.title}`} /> : <BookOpen />}
              </div>
              <div>
                <span className={`status ${story.status}`}>{story.status === 'draft' ? 'Borrador' : story.status === 'archived' ? 'Archivada' : 'Publicada'}</span>
                <h2>{story.title}</h2><p>{story.synopsis}</p>
                {user?.isAdmin && <p>Por {story.author} (@{story.authorUsername})</p>}
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
            <div className="field"><label>Generos (hasta 5)</label><div className="filter-chips">{taxonomy?.genres.map((genre) => <button type="button" key={genre} className={selectedGenres.includes(genre) ? 'active' : ''} onClick={() => setSelectedGenres((current) => current.includes(genre) ? current.filter((item) => item !== genre) : current.length < 5 ? [...current, genre] : current)}>{genre}</button>)}</div></div>
            {taxonomy?.tagGroups.map((group) => <details className="tag-filter-group" key={group.kind}><summary>{group.label}</summary><div className="filter-chips">{group.tags.map((tag) => <button type="button" key={tag} className={selectedTags.includes(tag) ? 'active' : ''} onClick={() => setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : current.length < 20 ? [...current, tag] : current)}>{tag}</button>)}</div></details>)}
            <div className="field"><label>Clasificacion por edad</label><select value={ageRating} onChange={(event) => setAgeRating(event.target.value as typeof ageRating)}>{taxonomy?.ageRatings.map((rating) => <option key={rating.value} value={rating.value}>{rating.label}</option>)}</select></div>
            <div className="cover-picker-row">
              <button type="button" className="cover-preview" onClick={() => coverInput.current?.click()} aria-label="Elegir imagen de portada">
                {coverPreview ? <img src={coverPreview} alt="Vista previa de la portada" /> : <><ImagePlus size={30} /><span>Agregar portada</span></>}
              </button>
              <div className="cover-picker-copy">
                <strong>Imagen de portada</strong>
                <p>Recorta una imagen al formato vertical 2:3, hasta 5 MB.</p>
                <div>
                  <button type="button" className="secondary-button" onClick={() => coverInput.current?.click()}>{coverFile ? 'Cambiar imagen' : 'Elegir imagen'}</button>
                  {coverFile && <button type="button" className="icon-button danger" title="Quitar portada" onClick={() => { setCoverFile(null); setCoverPreview(null); }}><Trash2 size={17} /></button>}
                </div>
              </div>
              <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => { selectCover(event.target.files?.[0]); event.target.value = ''; }} />
            </div>
            <label className="check-field"><input name="isMature" type="checkbox" />Contenido para adultos</label>
            {createError && <p className="form-error" role="alert">{createError}</p>}
            <div className="modal-actions"><button type="button" className="secondary-button" disabled={creating} onClick={closeCreate}>Cancelar</button><button className="primary-button" disabled={creating}>{creating ? 'Creando...' : 'Crear borrador'}</button></div>
          </form>
        </div>
      )}
      {coverCrop && (
        <CoverCropDialog
          source={coverCrop.source}
          filename={coverCrop.filename}
          onCancel={cancelCoverCrop}
          onApply={applyCoverCrop}
        />
      )}
    </div>
  );
}
