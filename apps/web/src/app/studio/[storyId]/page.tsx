'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Eye, FilePlus2, ImagePlus, PenLine, Save, Send, Tags, Trash2 } from 'lucide-react';
import { CoverCropDialog } from '@/components/cover-crop-dialog';
import { apiFetch, apiUrl } from '@/lib/api';
import { normalizeStoryTaxonomy } from '@/lib/story-taxonomy';
import type { ChapterSummary, StoryDetail, StoryTaxonomy } from '@/lib/types';

export default function ManageStoryPage({ params }: { params: { storyId: string } }) {
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [coverCrop, setCoverCrop] = useState<{ source: string; filename: string } | null>(null);
  const [coverSaving, setCoverSaving] = useState(false);
  const [taxonomy, setTaxonomy] = useState<StoryTaxonomy | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ageRating, setAgeRating] = useState<'all' | '11' | '13' | '16' | '18'>('all');
  const [creationMethod, setCreationMethod] = useState<'human' | 'ai_assisted' | 'ai_generated'>('human');
  const [taxonomySaving, setTaxonomySaving] = useState(false);
  const [taxonomyMessage, setTaxonomyMessage] = useState('');
  const coverInput = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    const loaded = await apiFetch<StoryDetail>(`/v1/me/stories/${params.storyId}`);
    setStory(loaded);
    setSelectedGenres(loaded.genres?.length ? loaded.genres : [loaded.genre]);
    setSelectedTags(loaded.tags?.map((tag) => tag.name) ?? []);
    setAgeRating(loaded.ageRating ?? (loaded.isMature ? '18' : 'all'));
    setCreationMethod(loaded.creationMethod ?? 'human');
  }, [params.storyId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void apiFetch<StoryTaxonomy>('/v1/stories/filters?schema=2').then((value) => setTaxonomy(normalizeStoryTaxonomy(value))).catch(() => setTaxonomy(normalizeStoryTaxonomy(null))); }, []);

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

  function selectCover(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      window.alert('La portada debe ser JPG, PNG o WebP y pesar hasta 5 MB.');
      return;
    }
    setCoverCrop({ source: URL.createObjectURL(file), filename: file.name });
  }

  async function applyCover(file: File) {
    setCoverSaving(true);
    try {
      const intent = await apiFetch<{ mediaId: string; uploadPath: string }>('/v1/media/upload-intent', { method: 'POST', body: JSON.stringify({ filename: file.name, mimeType: file.type, sizeBytes: file.size, purpose: 'cover' }) });
      const upload = await fetch(apiUrl(intent.uploadPath), { method: 'PUT', credentials: 'include', headers: { 'Content-Type': file.type }, body: file });
      if (!upload.ok) throw new Error('No pudimos subir la portada.');
      const confirmed = await apiFetch<{ publicUrl: string }>(`/v1/media/${intent.mediaId}/confirm`, { method: 'POST' });
      await apiFetch(`/v1/me/stories/${params.storyId}`, { method: 'PATCH', body: JSON.stringify({ coverColor: confirmed.publicUrl }) });
      await load();
    } finally {
      if (coverCrop) URL.revokeObjectURL(coverCrop.source);
      setCoverCrop(null);
      setCoverSaving(false);
    }
  }

  function toggleGenre(genre: string) {
    setSelectedGenres((current) => current.includes(genre)
      ? current.filter((item) => item !== genre)
      : current.length < 5 ? [...current, genre] : current);
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) => current.includes(tag)
      ? current.filter((item) => item !== tag)
      : current.length < 20 ? [...current, tag] : current);
  }

  async function saveTaxonomy() {
    if (!selectedGenres.length) {
      setTaxonomyMessage('Selecciona al menos un genero.');
      return;
    }
    setTaxonomySaving(true);
    setTaxonomyMessage('');
    try {
      await apiFetch(`/v1/me/stories/${params.storyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ genres: selectedGenres, tags: selectedTags, ageRating, creationMethod }),
      });
      await load();
      setTaxonomyMessage('Clasificacion actualizada.');
    } catch (error) {
      setTaxonomyMessage(error instanceof Error ? error.message : 'No pudimos actualizar la clasificacion.');
    } finally {
      setTaxonomySaving(false);
    }
  }

  if (!story) return <div className="page"><div className="empty-state">Cargando obra...</div></div>;
  return (
    <div className="page">
      <Link className="back-link" href="/studio"><ArrowLeft size={17} />Volver al estudio</Link>
      <div className="page-heading">
        <div className="manage-story-heading">
          <button className="manage-cover" onClick={() => coverInput.current?.click()} disabled={coverSaving} title="Cambiar portada">
            {story.coverColor?.startsWith('http') ? <img src={story.coverColor} alt={`Portada de ${story.title}`} /> : <ImagePlus size={28} />}
          </button>
          <div><span className={`status ${story.status}`}>{story.status}</span><h1>{story.title}</h1><p>{story.synopsis}</p><button className="cover-edit-command" onClick={() => coverInput.current?.click()} disabled={coverSaving}><ImagePlus size={15} />{coverSaving ? 'Guardando...' : 'Editar portada'}</button></div>
          <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { selectCover(event.target.files?.[0]); event.target.value = ''; }} />
        </div>
        <div className="heading-actions">
          {story.status === 'published' && <Link className="secondary-button" href={`/stories/${story.id}`}><Eye size={17} />Ver publicada</Link>}
          {story.status === 'draft' && <button className="secondary-button" onClick={async () => { await apiFetch(`/v1/me/stories/${story.id}/publish`, { method: 'POST' }); await load(); }}><Send size={17} />Publicar obra</button>}
          <button className="primary-button" onClick={createChapter}><FilePlus2 size={17} />Nuevo capitulo</button>
        </div>
      </div>
      <section className="story-taxonomy-editor">
        <div className="story-taxonomy-head"><div><Tags size={19} /><div><h2>Clasificacion</h2><p>Generos, tipo, ambientacion, tono y advertencias de contenido.</p></div></div><button className="primary-button" disabled={taxonomySaving || !taxonomy} onClick={() => void saveTaxonomy()}><Save size={16} />{taxonomySaving ? 'Guardando...' : 'Guardar'}</button></div>
        <div className="field"><label>Generos ({selectedGenres.length}/5)</label><div className="filter-chips">{taxonomy?.genres.map((genre) => <button type="button" key={genre} className={selectedGenres.includes(genre) ? 'active' : ''} onClick={() => toggleGenre(genre)}>{genre}</button>)}</div></div>
        <div className="field"><label>Clasificacion por edad</label><select value={ageRating} onChange={(event) => setAgeRating(event.target.value as typeof ageRating)}>{taxonomy?.ageRatings.map((rating) => <option key={rating.value} value={rating.value}>{rating.label}</option>)}</select><small>{taxonomy?.ageRatings.find((rating) => rating.value === ageRating)?.description} Algunas etiquetas pueden elevar automaticamente la clasificacion minima.</small></div>
        <div className="field"><label>Origen del contenido</label><select value={creationMethod} onChange={(event) => setCreationMethod(event.target.value as typeof creationMethod)}><option value="human">Creada por autor</option><option value="ai_assisted">Asistida por IA</option><option value="ai_generated">Generada por IA</option></select><small>Esta declaracion se muestra a los lectores junto a la historia.</small></div>
        {taxonomy?.tagGroups.map((group) => <details className="tag-filter-group" key={group.kind} open={selectedTags.some((tag) => group.tags.includes(tag))}><summary>{group.label}<span>{selectedTags.filter((tag) => group.tags.includes(tag)).length || ''}</span></summary><div className="filter-chips">{group.tags.map((tag) => <button type="button" key={tag} className={selectedTags.includes(tag) ? 'active' : ''} onClick={() => toggleTag(tag)}>{tag}</button>)}</div></details>)}
        {taxonomyMessage && <p className={taxonomyMessage.includes('actualizada') ? 'success-message' : 'form-error'}>{taxonomyMessage}</p>}
      </section>
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
      {coverCrop && <CoverCropDialog source={coverCrop.source} filename={coverCrop.filename} onCancel={() => { URL.revokeObjectURL(coverCrop.source); setCoverCrop(null); }} onApply={(file) => void applyCover(file)} />}
    </div>
  );
}
