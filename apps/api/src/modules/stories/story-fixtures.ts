export type StoryStatus = 'draft' | 'published' | 'completed' | 'archived' | 'suspended';

export type StorySummary = {
  id: string;
  title: string;
  author: string;
  authorUsername: string;
  synopsis: string;
  genre: string;
  genres?: string[];
  tags?: Array<{ name: string; kind: string }>;
  languageCode?: string;
  status: StoryStatus;
  chapterCount: number;
  isMature: boolean;
  coverColor: string;
  averageRating?: number;
  ratingCount?: number;
  sourceUrl?: string;
  sourceLicense?: string;
  updatedAt?: string;
};

export type Chapter = {
  id: string;
  storyId: string;
  position: number;
  title: string;
  content: string[];
};

export const storyFixtures: StorySummary[] = [
  {
    id: 'story-lighthouse',
    title: 'La luz del faro',
    author: 'Marina Solís',
    authorUsername: 'marina-solis',
    synopsis: 'Una cartógrafa vuelve a la costa donde creció y encuentra un mapa que no debería existir.',
    genre: 'Misterio',
    status: 'published',
    chapterCount: 3,
    isMature: false,
    coverColor: '#1f5f73'
  },
  {
    id: 'story-quiet-city',
    title: 'La ciudad en silencio',
    author: 'Tomás Vidal',
    authorUsername: 'tomas-vidal',
    synopsis: 'Cuando todos dejan de hablar durante una noche, una bibliotecaria decide salir a buscar la causa.',
    genre: 'Ciencia ficción',
    status: 'published',
    chapterCount: 2,
    isMature: false,
    coverColor: '#7f4f24'
  }
];

export const chapterFixtures: Chapter[] = [
  {
    id: 'chapter-lighthouse-1',
    storyId: 'story-lighthouse',
    position: 1,
    title: 'El mapa bajo la sal',
    content: [
      'El faro llevaba tres inviernos apagado cuando Marina volvió a verlo.',
      'Desde la carretera, la torre parecía un lápiz blanco clavado en el borde del mundo. El viento arrastraba sal y pequeñas hojas de algas hasta las ventanas del auto.',
      'En la casa de su abuela encontró un mapa doblado dentro de una caja de fósforos. No tenía nombres, solo una línea azul que desaparecía bajo el mar.',
      'Marina reconoció la tinta antes de recordar la letra. Era la misma que su padre usaba en sus cuadernos de navegación.'
    ]
  },
  {
    id: 'chapter-lighthouse-2',
    storyId: 'story-lighthouse',
    position: 2,
    title: 'La escalera de hierro',
    content: [
      'La puerta del faro cedió con un ruido breve, casi una disculpa.',
      'Dentro, la escalera de hierro conservaba el frío de la noche. Marina subió contando los peldaños para no pensar en el dibujo que llevaba en el bolsillo.',
      'En el segundo descanso encontró una marca reciente: tres círculos sobre la pintura descascarada.'
    ]
  },
  {
    id: 'chapter-lighthouse-3',
    storyId: 'story-lighthouse',
    position: 3,
    title: 'La habitación sin ventanas',
    content: [
      'Arriba no había lámpara, pero sí una habitación que no figuraba en ningún plano.',
      'La línea azul del mapa terminaba exactamente en el centro del suelo.'
    ]
  },
  {
    id: 'chapter-quiet-city-1',
    storyId: 'story-quiet-city',
    position: 1,
    title: 'A las 23:17',
    content: [
      'A las 23:17, la ciudad dejó de hablar.',
      'No fue un apagón ni una alarma. Las bocas se movieron, las manos señalaron, los trenes continuaron avanzando. Solo desapareció la voz.',
      'Elena cerró el libro que estaba catalogando y escuchó por primera vez el peso completo del edificio.'
    ]
  },
  {
    id: 'chapter-quiet-city-2',
    storyId: 'story-quiet-city',
    position: 2,
    title: 'El sótano de la biblioteca',
    content: [
      'En el sótano, los tubos fluorescentes parpadeaban como si intentaran formar palabras.',
      'Elena encontró una caja de cintas magnéticas etiquetada con fechas que aún no habían ocurrido.'
    ]
  }
];
