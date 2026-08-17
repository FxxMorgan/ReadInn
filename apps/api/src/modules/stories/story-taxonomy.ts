export const STORY_GENRES = [
  'Acción', 'Aventura', 'Fantasía', 'Ciencia Ficción', 'Romance', 'Comedia',
  'Drama', 'Misterio', 'Suspenso', 'Thriller', 'Terror', 'Psicológico',
  'Histórico', 'Artes Marciales', 'Cultivación', 'Sobrenatural', 'Mitología',
  'Escolar', 'Slice of Life', 'Isekai', 'Reencarnación', 'Regresión', 'LitRPG',
  'Videojuegos', 'Apocalíptico', 'Postapocalíptico', 'Superpoderes', 'Militar',
  'Político', 'Mecha', 'Deportes', 'Música', 'Entretenimiento', 'Cocina',
  'Negocios', 'Economía', 'Familia', 'Western', 'Crimen', 'Mafia', 'Viajes',
  'Supervivencia', 'Religión', 'Espiritual', 'Filosofía', 'Harem', 'Girls Love',
  'Boys Love', 'Adulto',
] as const;

export const STORY_TAG_GROUPS = {
  type: {
    label: 'Tipo',
    tags: [
      'Sistema', 'Estadísticas', 'Niveles', 'Habilidades', 'LitRPG', 'MMORPG',
      'Videojuego', 'Cultivación', 'Xianxia', 'Wuxia', 'Murim', 'Isekai',
      'Reencarnación', 'Regresión', 'Transmigración', 'Invocación',
      'Viaje en el tiempo', 'Crossover', 'Alternate Universe', 'Canon Divergence',
      'Post-Canon', 'Pre-Canon', 'What If', 'Retelling', 'Gender Swap',
      'Role Swap', 'Modern AU', 'Historical AU', 'Futuristic AU',
    ],
  },
  setting: {
    label: 'Ambientación',
    tags: [
      'Viajes', 'Exploración', 'Alta fantasía', 'Fantasía oscura',
      'Fantasía urbana', 'Fantasía medieval', 'Steampunk', 'Cyberpunk',
      'Distopía', 'Utopía', 'Espacio', 'Viajes espaciales', 'Mazmorras', 'Torres',
      'Calabozos', 'Sectas', 'Clanes', 'Academia', 'Escuela', 'Universidad',
      'Imperio', 'Reino', 'Nobleza', 'Aristocracia', 'Otro mundo', 'Apocalipsis',
      'Mundo moderno', 'Mundo futurista', 'Mundo postapocalíptico',
      'Antiguo Oriente', 'Japón', 'China', 'Corea', 'Europa medieval',
    ],
  },
  tone: {
    label: 'Tono',
    tags: [
      'Comedia romántica', 'Tragedia', 'Final feliz', 'Final triste',
      'Final abierto', 'Oscuro', 'Sombrío', 'Emocional', 'Inspirador',
      'Feel Good', 'Parodia', 'Sátira', 'Humor absurdo', 'Humor negro',
      'Horror psicológico', 'Terror sobrenatural',
    ],
  },
  content: {
    label: 'Contenido',
    tags: [
      'Gore', 'Violencia', 'Zombies', '+18', 'Contenido sexual',
      'Violencia gráfica', 'Lenguaje fuerte', 'Drogas', 'Temas maduros',
      'Contenido sensible',
    ],
  },
  theme: {
    label: 'Temas y recursos',
    tags: [
      'Acción intensa', 'Aventuras', 'Magia', 'Alienígenas',
      'Tecnología avanzada', 'Inteligencia artificial', 'Robots', 'Monstruos',
      'Dragones', 'Vampiros', 'Hombres lobo', 'Demonios', 'Ángeles', 'Dioses',
      'Espíritus', 'Fantasmas', 'Mitología', 'Artes marciales', 'Torneos',
      'Vida cotidiana', 'Familia', 'Crianza', 'Paternidad', 'Amistad',
      'Romance lento', 'Amor a primera vista', 'Triángulo amoroso',
      'Rivales a amantes', 'Amigos a amantes', 'Matrimonio',
      'Matrimonio arreglado', 'Novios falsos', 'Reencuentro', 'Amor prohibido',
      'Poliamor', 'Harem', 'Reverse Harem', 'Boys Love', 'Girls Love', 'LGBTQ+',
      'Venganza', 'Redención', 'Traición', 'Conspiración', 'Intriga política',
      'Guerra', 'Personaje original', 'Self-Insert', 'Reader-Insert',
      'Villano protagonista', 'Antihéroe', 'Héroe protagonista',
      'Protagonista poderoso', 'Protagonista débil', 'Protagonista inteligente',
      'Protagonista malvado', 'Protagonista femenino', 'Protagonista masculino',
      'Protagonista múltiple', 'Narrador no confiable', 'Viaje del héroe',
      'Supervivencia', 'Misterio', 'Investigación', 'Detectives', 'Crimen',
      'Mafia', 'Asesinato', 'Cuarta pared', 'Slice of Life', 'Cocina',
      'Gastronomía', 'Deportes', 'Música', 'Fama', 'Celebridades', 'Actores',
      'Ídolos', 'Empresas', 'Dinero', 'Comercio', 'Construcción', 'Gestión',
      'Política', 'Estrategia', 'Guerra de poder', 'Superpoderes', 'Héroes',
      'Villanos', 'Mutantes', 'Mechas', 'Vehículos', 'Piratas', 'Ninjas',
      'Samuráis', 'Vaqueros', 'Histórico',
    ],
  },
} as const;

export type StoryTagKind = keyof typeof STORY_TAG_GROUPS;
export type StoryAgeRating = 'all' | '11' | '13' | '16' | '18';

export interface StoryTagDefinition {
  name: string;
  kind: StoryTagKind;
}

export const STORY_TAGS: StoryTagDefinition[] = Object.entries(STORY_TAG_GROUPS)
  .flatMap(([kind, group]) => group.tags.map((name) => ({
    name,
    kind: kind as StoryTagKind,
  })));

function normalizeTaxonomyValue(value: string): string {
  return value.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const normalizedTagKind = new Map(
  STORY_TAGS.map((tag) => [normalizeTaxonomyValue(tag.name), tag.kind]),
);

export function storyTagKind(name: string): StoryTagKind | null {
  return normalizedTagKind.get(normalizeTaxonomyValue(name)) ?? null;
}

const ageRatingOrder: StoryAgeRating[] = ['all', '11', '13', '16', '18'];
const tagMinimumAgeEntries: Array<[string, StoryAgeRating]> = [
  ['Violencia', '13'],
  ['Lenguaje fuerte', '13'],
  ['Horror psicológico', '13'],
  ['Terror sobrenatural', '13'],
  ['Contenido sensible', '13'],
  ['Gore', '16'],
  ['Violencia gráfica', '16'],
  ['Drogas', '16'],
  ['Temas maduros', '16'],
  ['Contenido sexual', '18'],
];
const tagMinimumAge = new Map<string, StoryAgeRating>(
  tagMinimumAgeEntries.map(([tag, rating]) => [normalizeTaxonomyValue(tag), rating]),
);

export function minimumAgeRatingForTags(tags: string[]): StoryAgeRating {
  return tags.reduce<StoryAgeRating>((minimum, tag) => {
    const required = tagMinimumAge.get(normalizeTaxonomyValue(tag)) ?? 'all';
    return ageRatingOrder.indexOf(required) > ageRatingOrder.indexOf(minimum) ? required : minimum;
  }, 'all');
}

export function enforceMinimumAgeRating(requested: StoryAgeRating, tags: string[]): StoryAgeRating {
  const minimum = minimumAgeRatingForTags(tags);
  return ageRatingOrder.indexOf(minimum) > ageRatingOrder.indexOf(requested) ? minimum : requested;
}

export function storyTaxonomyResponse() {
  return {
    genres: [...STORY_GENRES],
    tagGroups: Object.entries(STORY_TAG_GROUPS).map(([kind, group]) => ({
      kind,
      label: group.label,
      tags: [...group.tags],
    })),
    sortOptions: [
      { value: 'recent', label: 'Más recientes' },
      { value: 'popular', label: 'Más leídas' },
      { value: 'rating', label: 'Mejor valoradas' },
      { value: 'chapters', label: 'Más capítulos' },
      { value: 'title', label: 'Título' },
    ],
    ageRatings: [
      { value: 'all', label: 'Todo público' },
      { value: '11', label: '+11' },
      { value: '13', label: '+13' },
      { value: '16', label: '+16' },
      { value: '18', label: '+18' },
    ],
    automaticAgeRules: [
      { tags: ['Violencia', 'Lenguaje fuerte', 'Horror psicológico', 'Terror sobrenatural', 'Contenido sensible'], minimum: '13' },
      { tags: ['Gore', 'Violencia gráfica', 'Drogas', 'Temas maduros'], minimum: '16' },
      { tags: ['Contenido sexual'], minimum: '18' },
    ],
  };
}
