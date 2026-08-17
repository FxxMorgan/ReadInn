'use client';

import Link from 'next/link';
import { SlidersHorizontal, Star, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BookCard } from '@/components/book-card';
import { StoryShelf } from '@/components/story-shelf';
import { apiFetch } from '@/lib/api';
import { normalizeStoryTaxonomy } from '@/lib/story-taxonomy';
import type { StorySummary, StoryTaxonomy } from '@/lib/types';

const emptyTaxonomy: StoryTaxonomy = { genres: [], tagGroups: [], sortOptions: [], ageRatings: [] };
const shelfDefinitions = [
  { key: 'trending', title: 'Tendencias', description: 'Las historias que más están leyendo ahora.' },
  { key: 'new', title: 'Recién publicadas', description: 'Nuevas historias para descubrir.', sort: 'recent' },
  { key: 'comedy', title: 'Comedia', description: 'Historias ligeras, divertidas y con buen humor.', genres: ['Comedia'] },
  { key: 'drama', title: 'Drama', description: 'Conflictos humanos, decisiones difíciles y emociones intensas.', genres: ['Drama'] },
  { key: 'fantasy', title: 'Aventura y fantasía', description: 'Mundos imposibles, viajes y grandes desafíos.', genres: ['Aventura', 'Fantasía'] },
  { key: 'romance', title: 'Romance', description: 'Encuentros, decisiones y vínculos que dejan huella.', genres: ['Romance'] },
] as const;

type ShelfKey = typeof shelfDefinitions[number]['key'];

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
  const [showAllResults, setShowAllResults] = useState(false);
  const [shelves, setShelves] = useState<Record<ShelfKey, StorySummary[]>>({
    trending: [],
    new: [],
    comedy: [],
    drama: [],
    fantasy: [],
    romance: [],
  });

  const activeFilters = genres.length + tags.length + Number(mature !== 'exclude') + Number(minChapters > 0) + Number(minRating > 0);
  useEffect(() => {
    const initialQuery = new URLSearchParams(window.location.search).get('query')?.trim();
    if (initialQuery) setQuery(initialQuery);
  }, []);
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
    const shelfRequest = (shelf: typeof shelfDefinitions[number]) => {
      const params = new URLSearchParams({ limit: '12', sort: 'genre' in shelf ? 'popular' : ('sort' in shelf ? shelf.sort : 'popular'), mature: 'exclude' });
      if ('genres' in shelf) params.set('genres', shelf.genres.join(','));
      return apiFetch<StorySummary[]>(`/v1/stories?${params}`);
    };
    void Promise.all(shelfDefinitions.map(shelfRequest))
      .then((items) => setShelves({
        trending: items[0] ?? [],
        new: items[1] ?? [],
        comedy: items[2] ?? [],
        drama: items[3] ?? [],
        fantasy: items[4] ?? [],
        romance: items[5] ?? [],
      }))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!query && !activeFilters && !showAllResults) {
      setError('');
      return;
    }
    const timeout = setTimeout(() => {
      setError('');
      void apiFetch<StorySummary[]>(`/v1/stories?${searchParams}`)
        .then(setStories)
        .catch((reason) => setError(reason.message));
    }, 220);
    return () => clearTimeout(timeout);
  }, [activeFilters, query, searchParams, showAllResults]);

  function toggle(value: string, values: string[], update: (next: string[]) => void) {
    update(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function clearFilters() {
    setGenres([]); setTags([]); setSort('recent'); setMature('exclude'); setMinChapters(0); setMinRating(0); setShowAllResults(false);
  }

  function showShelf(shelf: typeof shelfDefinitions[number]) {
    setQuery('');
    setTags([]);
    setMature('exclude');
    setMinChapters(0);
    setMinRating(0);
    setSort('popular');
    setGenres('genres' in shelf ? [...shelf.genres] : []);
    setSort('sort' in shelf ? shelf.sort : 'popular');
    setShowAllResults(true);
    setShowFilters('genres' in shelf);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const showingShelves = !query && !activeFilters && !showAllResults;

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

      {featured && showingShelves && <section className="featured-story"><div><span className="eyebrow">Destacada de las ultimas 24 horas</span><h2>{featured.title}</h2><p>{featured.synopsis}</p><div><span>{featured.author}</span>{featured.averageRating ? <span><Star size={14} />{featured.averageRating.toFixed(1)}</span> : null}</div><Link className="primary-button" href={`/stories/${featured.id}`}>Leer ahora</Link></div><BookCard story={featured} /></section>}

      {showingShelves ? (
        <div className="home-shelves">
          {shelfDefinitions.map((shelf) => {
            const items = shelves[shelf.key];
            if (!items.length) return null;
            return <StoryShelf key={shelf.key} title={shelf.title} description={shelf.description} stories={items} onMore={() => showShelf(shelf)} />;
          })}
        </div>
      ) : (
        <>
          <div className="results-heading"><h2>Resultados</h2><span>{stories.length} obras</span></div>
          {error ? <div className="error-state">{error}</div> : stories.length ? <div className="book-grid">{stories.map((story) => <BookCard key={story.id} story={story} />)}</div> : <div className="empty-state">No encontramos obras con estos filtros.</div>}
        </>
      )}
    </div>
  );
}
