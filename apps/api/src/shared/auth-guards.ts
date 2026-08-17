import type { FastifyRequest } from 'fastify';
import { bearerClaims } from './auth.js';
import { checkDatabaseConnection, prisma } from './db.js';
import { AppError } from './errors.js';

export interface AuthenticatedUser {
  id: string;
  isAdmin: boolean;
  email?: string;
}

export async function resolveActiveUser(request: FastifyRequest): Promise<AuthenticatedUser | null> {
  const claims = bearerClaims(request.headers.authorization);
  if (!claims) return null;

  if (!(await checkDatabaseConnection())) {
    return { id: claims.userId, isAdmin: false, ...(claims.email ? { email: claims.email } : {}) };
  }

  const user = await prisma.user.findFirst({
    where: { id: claims.userId, accountStatus: 'active', deletedAt: null },
    select: { id: true, isAdmin: true, email: true },
  });
  return user ?? null;
}

export async function requireUser(request: FastifyRequest): Promise<AuthenticatedUser> {
  const user = await resolveActiveUser(request);
  if (!user) throw new AppError('AUTH_REQUIRED', 'Inicia sesion para continuar.', 401);
  return user;
}

export async function requireAdmin(request: FastifyRequest): Promise<AuthenticatedUser> {
  const user = await requireUser(request);
  if (!user.isAdmin) throw new AppError('ADMIN_REQUIRED', 'Requiere permisos de administrador.', 403);
  return user;
}
