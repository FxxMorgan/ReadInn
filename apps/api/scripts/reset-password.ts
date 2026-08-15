import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

function loadDotEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const separator = trimmed.indexOf('=');
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  }
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

loadDotEnv();

const email = process.argv[2]?.trim().toLowerCase();
const password = process.env.READINN_NEW_PASSWORD ?? '';

if (!email) {
  throw new Error('Uso: READINN_NEW_PASSWORD="..." pnpm reset-password correo@ejemplo.com');
}

if (password.length < 8) {
  throw new Error('La nueva contrasena necesita al menos 8 caracteres.');
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash: hashPassword(password) },
    select: { email: true, username: true },
  });

  console.log(`Contrasena actualizada para ${user.email} (${user.username}).`);
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
    throw new Error(`No existe una cuenta con el correo ${email}.`);
  }
  throw error;
} finally {
  await prisma.$disconnect();
}
