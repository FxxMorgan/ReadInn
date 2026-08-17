'use client';

import Link from 'next/link';
import { SlidersHorizontal, Star, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BookCard } from '@/components/book-card';
import { apiFetch } from '@/lib/api';
import { normalizeStoryTaxonomy } from '@/lib/story-taxonomy';
import type { StorySummary, StoryTaxonomy } from '@/lib/types';

const emptyTaxonomy: StoryTaxonomy = { genres: [], tagGroups: [], sortOptions: [], ageRatings: [] };

export default function ExplorePage() {
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [featured, setFeatured] = useState<StorySummary | null>(null);
  const [taxonomy, setTaxonomy] = useState<StoryTaxonomy>(emptyTaxonomy);
  const [query, setQuery] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [sort, setSort] = useState('recent');
  const [mature, setMature] = useState('exclude');
  const [minChapters, setMinChapters] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState('');

  const activeFilters = genres.length + tags.length + Number(mature !== 'exclude') + Number(minChapters > 0) + Number(minRating > 0);
  const searchParams = useMemo(() => {
    const params = new URLSearchParams({ limit: '50', sort, mature });
    if (query.trim()) params.set('query', query.trim());
    if (genres.length) params.set('genres', genres.join(','));
    if (tags.length) params.set('tags', tags.join(','));
    if (minChapters) params.set('minChapters', String(minChapters));
    if (minRating) params.set('minRating', String(minRating));
    return params.toString();
  }, [genres, mature, minChapters, minRating, query, sort, tags]);

  useEffect(() => {
    void Promise.all([
      apiFetch<StoryTaxonomy>('/v1/stories/filters'),
      apiFetch<StorySummary | null>('/v1/stories/featured'),
    ]).then(([filters, pick]) => { setTaxonomy(normalizeStoryTaxonomy(filters)); setFeatured(pick); }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setError('');
      void apiFetch<StorySummary[]>(`/v1/stories?${searchParams}`)
        .then(setStories)
        .catch((reason) => setError(reason.message));
    }, 220);
    return () => clearTimeout(timeout);
  }, [searchParams]);

  function toggle(value: string, values: string[], update: (next: string[]) => void) {
    update(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function clearFilters() {
    setGenres([]); setTags([]); setSort('recent'); setMature('exclude'); setMinChapters(0); setMinRating(0);
  }

  return (
    <div className="page discovery-page">
      <div className="page-heading discovery-heading">
        <div><span className="eyebrow">Tu refugio de lectura</span><h1>Historias para quedarte</h1><p>Busca por titulo, autor, genero, etiqueta o sinopsis.</p></div>
        <div className="discovery-search">
          <label className="search-box"><span className="sr-only">Buscar historias</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar historias, autores o etiquetas" /></label>
          <button className="filter-command" onClick={() => setShowFilters((value) => !value)}><SlidersHorizontal size={18} /><span>Filtros</span>{activeFilters > 0 && <b>{activeFilters}</b>}</button>
        </div>
      </div>

      {showFilters && <section className="advanced-filters" aria-label="Filtros avanzados">
        <div className="filter-toolbar"><strong>Explorar por clasificación</strong><button title="Cerrar filtros" onClick={() => setShowFilters(false)}><X size={18} /></button></div>
        <div className="filter-row"><label>Orden<select value={sort} onChange={(event) => setSort(event.target.value)}>{taxonomy.sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>Contenido<select value={mature} onChange={(event) => setMature(event.target.value)}><option value="exclude">Sin contenido adulto</option><option value="include">Todo</option><option value="only">Solo adulto</option></select></label><label>Capitulos minimos<input type="number" min={0} value={minChapters} onChange={(event) => setMinChapters(Math.max(0, Number(event.target.value)))} /></label><label>Valoracion minima<select value={minRating} onChange={(event) => setMinRating(Number(event.target.value))}><option value={0}>Cualquiera</option><option value={3}>3+</option><option value={4}>4+</option><option value={4.5}>4.5+</option></select></label></div>
        <div className="filter-section"><strong>Generos</strong><div className="filter-chips">{taxonomy.genres.map((genre) => <button type="button" className={genres.includes(genre) ? 'active' : ''} key={genre} onClick={() => toggle(genre, genres, setGenres)}>{genre}</button>)}</div></div>
        {taxonomy.tagGroups.map((group) => <details className="tag-filter-group" key={group.kind} open={tags.some((tag) => group.tags.includes(tag))}><summary>{group.label}<span>{tags.filter((tag) => group.tags.includes(tag)).length || ''}</span></summary><div className="filter-chips">{group.tags.map((tag) => <button type="button" className={tags.includes(tag) ? 'active' : ''} key={tag} onClick={() => toggle(tag, tags, setTags)}>{tag}</button>)}</div></details>)}
        {activeFilters > 0 && <button className="clear-filters" onClick={clearFilters}>Limpiar filtros</button>}
      </section>}

      {featured && !query && !activeFilters && <section className="featured-story"><div><span className="eyebrow">Destacada de las ultimas 24 horas</span><h2>{featured.title}</h2><p>{featured.synopsis}</p><div><span>{featured.author}</span>{featured.averageRating ? <span><Star size={14} />{featured.averageRating.toFixed(1)}</span> : null}</div><Link className="primary-button" href={`/stories/${featured.id}`}>Leer ahora</Link></div><BookCard story={featured} /></section>}

      <div className="results-heading"><h2>{query || activeFilters ? 'Resultados' : 'Tendencias'}</h2><span>{stories.length} obras</span></div>
      {error ? <div className="error-state">{error}</div> : stories.length ? <div className="book-grid">{stories.map((story) => <BookCard key={story.id} story={story} />)}</div> : <div className="empty-state">No encontramos obras con estos filtros.</div>}
    </div>
  );
}
