import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ReadInn seed...');

  // 1. Seed Genres
  const genresData = [
    { name: 'Misterio', slug: 'misterio', sortOrder: 1 },
    { name: 'Ciencia ficción', slug: 'ciencia-ficcion', sortOrder: 2 },
    { name: 'Fantasía', slug: 'fantasia', sortOrder: 3 },
    { name: 'Romance', slug: 'romance', sortOrder: 4 },
    { name: 'Terror', slug: 'terror', sortOrder: 5 },
    { name: 'Drama', slug: 'drama', sortOrder: 6 },
  ];

  const genresMap: Record<string, string> = {};
  for (const genreData of genresData) {
    const genre = await prisma.genre.upsert({
      where: { slug: genreData.slug },
      update: { name: genreData.name, sortOrder: genreData.sortOrder },
      create: genreData,
    });
    genresMap[genre.slug] = genre.id;
  }
  console.log('✅ Genres seeded');

  // 2. Seed Authors & Users
  const author1 = await prisma.user.upsert({
    where: { email: 'marina@readinn.app' },
    update: {},
    create: {
      email: 'marina@readinn.app',
      username: 'marina-solis',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456', // Simulated hash
      accountStatus: 'active',
      profile: {
        create: {
          displayName: 'Marina Solís',
          bio: 'Cartógrafa e investigadora de leyendas marítimas. Escribo historias donde el mar oculta secretos viejos.',
          donationUrl: 'https://ko-fi.com/marinasolis',
          locale: 'es',
        },
      },
    },
    include: { profile: true },
  });

  const author2 = await prisma.user.upsert({
    where: { email: 'tomas@readinn.app' },
    update: {},
    create: {
      email: 'tomas@readinn.app',
      username: 'tomas-vidal',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      accountStatus: 'active',
      profile: {
        create: {
          displayName: 'Tomás Vidal',
          bio: 'Escritor de ciencia ficción especulativa y tecnología del pasado.',
          locale: 'es',
        },
      },
    },
    include: { profile: true },
  });
  console.log('✅ Authors seeded');

  // 3. Seed Story 1: "La luz del faro"
  const story1 = await prisma.story.upsert({
    where: { slug: 'la-luz-del-faro' },
    update: {},
    create: {
      slug: 'la-luz-del-faro',
      authorId: author1.id,
      title: 'La luz del faro',
      synopsis:
        'Una cartógrafa vuelve a la costa donde creció y encuentra un mapa que no debería existir en los cuadernos de su padre.',
      status: 'published',
      isMature: false,
      coverUrl: null,
      languageCode: 'es',
      wordCount: 1250,
      publishedChapterCount: 3,
      publishedAt: new Date(),
      genres: {
        create: [
          { genreId: genresMap['misterio'] },
          { genreId: genresMap['fantasia'] },
        ],
      },
      chapters: {
        create: [
          {
            slug: 'el-mapa-bajo-la-sal',
            title: 'El mapa bajo la sal',
            status: 'published',
            position: 1,
            wordCount: 420,
            estimatedReadMin: 3,
            contentJson: [
              'El faro llevaba tres inviernos apagado cuando Marina volvió a verlo.',
              'Desde la carretera, la torre parecía un lápiz blanco clavado en el borde del mundo. El viento arrastraba sal y pequeñas hojas de algas hasta las ventanas del auto.',
              'En la casa de su abuela encontró un mapa doblado dentro de una caja de fósforos. No tenía nombres, solo una línea azul que desaparecía bajo el mar.',
              'Marina reconoció la tinta antes de recordar la letra. Era la misma que su padre usaba en sus cuadernos de navegación.',
            ],
            plainText:
              'El faro llevaba tres inviernos apagado cuando Marina volvió a verlo. Desde la carretera, la torre parecía un lápiz blanco clavado en el borde del mundo. En la casa de su abuela encontró un mapa doblado dentro de una caja de fósforos.',
            publishedAt: new Date(),
          },
          {
            slug: 'la-escalera-de-hierro',
            title: 'La escalera de hierro',
            status: 'published',
            position: 2,
            wordCount: 380,
            estimatedReadMin: 2,
            contentJson: [
              'La puerta del faro cedió con un ruido breve, casi una disculpa.',
              'Dentro, la escalera de hierro conservaba el frío de la noche. Marina subió contando los peldaños para no pensar en el dibujo que llevaba en el bolsillo.',
              'En el segundo descanso encontró una marca reciente: tres círculos sobre la pintura descascarada.',
            ],
            plainText:
              'La puerta del faro cedió con un ruido breve, casi una disculpa. Dentro, la escalera de hierro conservaba el frío de la noche.',
            publishedAt: new Date(),
          },
          {
            slug: 'la-habitacion-sin-ventanas',
            title: 'La habitación sin ventanas',
            status: 'published',
            position: 3,
            wordCount: 450,
            estimatedReadMin: 3,
            contentJson: [
              'Arriba no había lámpara, pero sí una habitación que no figuraba en ningún plano.',
              'La línea azul del mapa terminaba exactamente en el centro del suelo.',
            ],
            plainText:
              'Arriba no había lámpara, pero sí una habitación que no figuraba en ningún plano. La línea azul del mapa terminaba exactamente en el centro del suelo.',
            publishedAt: new Date(),
          },
        ],
      },
    },
  });

  // 4. Seed Story 2: "La ciudad en silencio"
  await prisma.story.upsert({
    where: { slug: 'la-ciudad-en-silencio' },
    update: {},
    create: {
      slug: 'la-ciudad-en-silencio',
      authorId: author2.id,
      title: 'La ciudad en silencio',
      synopsis:
        'Cuando todos dejan de hablar durante una noche, una bibliotecaria decide salir a buscar la causa en los sótanos de la ciudad.',
      status: 'published',
      isMature: false,
      coverUrl: null,
      languageCode: 'es',
      wordCount: 980,
      publishedChapterCount: 2,
      publishedAt: new Date(),
      genres: {
        create: [{ genreId: genresMap['ciencia-ficcion'] }],
      },
      chapters: {
        create: [
          {
            slug: 'a-las-23-17',
            title: 'A las 23:17',
            status: 'published',
            position: 1,
            wordCount: 500,
            estimatedReadMin: 3,
            contentJson: [
              'A las 23:17, la ciudad dejó de hablar.',
              'No fue un apagón ni una alarma. Las bocas se movieron, las manos señalaron, los trenes continuaron avanzando. Solo desapareció la voz.',
              'Elena cerró el libro que estaba catalogando y escuchó por primera vez el peso completo del edificio.',
            ],
            plainText:
              'A las 23:17, la ciudad dejó de hablar. No fue un apagón ni una alarma.',
            publishedAt: new Date(),
          },
          {
            slug: 'el-sotano-de-la-biblioteca',
            title: 'El sótano de la biblioteca',
            status: 'published',
            position: 2,
            wordCount: 480,
            estimatedReadMin: 3,
            contentJson: [
              'En el sótano, los tubos fluorescentes parpadeaban como si intentaran formar palabras.',
              'Elena encontró una caja de cintas magnéticas etiquetada con fechas que aún no habían ocurrido.',
            ],
            plainText:
              'En el sótano, los tubos fluorescentes parpadeaban como si intentaran formar palabras.',
            publishedAt: new Date(),
          },
        ],
      },
    },
  });

  console.log('✅ Stories and Chapters seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
