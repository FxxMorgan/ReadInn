import type { StoryTaxonomy } from './types';

export const defaultAgeRatings: StoryTaxonomy['ageRatings'] = [
  { value: 'all', label: 'Todo público', description: 'Apto para lectores de cualquier edad.' },
  { value: '11', label: '+11', description: 'Violencia y temas leves.' },
  { value: '13', label: '+13', description: 'Romance, peligro y temas moderados.' },
  { value: '16', label: '+16', description: 'Violencia fuerte y temas maduros.' },
  { value: '18', label: '+18', description: 'Contenido sexual explícito, gore o temas adultos fuertes.' },
];

export function normalizeStoryTaxonomy(value: Partial<StoryTaxonomy> | null | undefined): StoryTaxonomy {
  return {
    genres: Array.isArray(value?.genres) ? value.genres : [],
    tagGroups: Array.isArray(value?.tagGroups) ? value.tagGroups : [],
    sortOptions: Array.isArray(value?.sortOptions) ? value.sortOptions : [],
    ageRatings: Array.isArray(value?.ageRatings) && value.ageRatings.length
      ? value.ageRatings
      : defaultAgeRatings,
  };
}
