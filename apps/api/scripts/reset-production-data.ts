import { PrismaClient } from '@prisma/client';
import { loadEnvFile } from 'node:process';

const CONFIRMATION = 'DELETE_ALL_READINN_DATA';

if (process.env.READINN_RESET_CONFIRM !== CONFIRMATION) {
  throw new Error(
    `Operacion cancelada. Define READINN_RESET_CONFIRM=${CONFIRMATION} para confirmar el borrado.`,
  );
}

if (!process.env.DATABASE_URL) {
  loadEnvFile('.env');
}

const prisma = new PrismaClient();

try {
  const before = await prisma.$transaction(async (tx) => ({
    users: await tx.user.count(),
    stories: await tx.story.count(),
    comments: await tx.chapterComment.count(),
  }));

  console.log('Registros antes del borrado:', before);

  await prisma.$transaction(async (tx) => {
    await tx.story.deleteMany();
    await tx.user.deleteMany();
  });

  const after = await prisma.$transaction(async (tx) => ({
    users: await tx.user.count(),
    stories: await tx.story.count(),
    comments: await tx.chapterComment.count(),
    genres: await tx.genre.count(),
  }));

  console.log('Reinicio completado. Registros restantes:', after);
  console.log('El primer usuario que se registre recibira permisos de administrador.');
} finally {
  await prisma.$disconnect();
}
