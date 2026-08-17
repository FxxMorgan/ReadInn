import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

let fixtureMode = false;

export function configureDatabase(options: { fixtureMode: boolean }): void {
  fixtureMode = options.fixtureMode;
}

export function isFixtureMode(): boolean {
  return fixtureMode;
}

export async function probeDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export function checkDatabaseConnection(): Promise<boolean> {
  return Promise.resolve(!fixtureMode);
}
