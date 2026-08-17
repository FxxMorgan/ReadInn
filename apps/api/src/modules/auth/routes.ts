import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, checkDatabaseConnection } from '../../shared/db.js';
import { AppError } from '../../shared/errors.js';
import { accessToken, refreshToken, verifyToken } from '../../shared/auth.js';
import { requireUser } from '../../shared/auth-guards.js';

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(200),
  displayName: z.string().min(2).max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().max(200),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8).max(200),
});

const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(50).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const adultConfirmationSchema = z.object({ confirmed: z.literal(true) });

const PBKDF2_ITERATIONS = 210_000;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;

function derivePassword(password: string, salt: Buffer | string, iterations: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, 64, 'sha512', (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await derivePassword(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<{ valid: boolean; needsRehash: boolean }> {
  const modern = storedHash.split('$');
  if (modern.length === 4 && modern[0] === 'pbkdf2') {
    const iterations = Number(modern[1]);
    const salt = Buffer.from(modern[2] ?? '', 'hex');
    const expected = Buffer.from(modern[3] ?? '', 'hex');
    if (!Number.isSafeInteger(iterations) || iterations < 1 || salt.length === 0 || expected.length === 0) {
      return { valid: false, needsRehash: false };
    }
    const candidate = await derivePassword(password, salt, iterations);
    return {
      valid: candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected),
      needsRehash: iterations !== PBKDF2_ITERATIONS,
    };
  }

  const [legacySalt, legacyHash] = storedHash.split(':');
  if (!legacySalt || !legacyHash) return { valid: false, needsRehash: false };
  const expected = Buffer.from(legacyHash, 'hex');
  const candidate = await derivePassword(password, legacySalt, 1000);
  return {
    valid: candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected),
    needsRehash: true,
  };
}

function refreshTokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueRefreshSession(userId: string, persist: boolean): Promise<string> {
  const token = refreshToken(userId);
  if (persist) {
    await prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: refreshTokenHash(token),
        expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
      },
    });
  }
  return token;
}

export function registerAuthRoutes(app: FastifyInstance): void {
  // Register
  app.post('/v1/auth/register', {
    config: {
      rateLimit: { max: 5, timeWindow: '1 hour' },
    },
  }, async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const username = body.username.toLowerCase();
    const displayName = body.displayName ?? body.username;
    const isDbConnected = await checkDatabaseConnection();
    if (!isDbConnected) {
      const token = accessToken(`user-${username}`, body.email);
      return reply.status(201).send({
        data: {
          user: {
            id: `user-${username}`,
            email: body.email,
            username,
            displayName,
            isAdmin: false,
            adultConfirmed: false,
          },
          token,
          refreshToken: await issueRefreshSession(`user-${username}`, false),
        },
      });
    }

    const passwordHash = await hashPassword(body.password);

    const user = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(731942581)`;
      const existingUser = await tx.user.findFirst({
        where: {
          OR: [
            { email: body.email },
            { username: { equals: username, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      if (existingUser) {
        throw new AppError('USER_EXISTS', 'El correo o nombre de usuario ya esta registrado.', 400);
      }
      const isFirstUser = (await tx.user.count()) === 0;
      return tx.user.create({
        data: {
          email: body.email,
          username,
          passwordHash,
          accountStatus: 'active',
          isAdmin: isFirstUser,
          profile: {
            create: {
              displayName,
              locale: 'es',
            },
          },
        },
        include: { profile: true },
      });
    });

    const token = accessToken(user.id, user.email);
    const nextRefreshToken = await issueRefreshSession(user.id, true);

    return reply.status(201).send({
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.profile?.displayName ?? user.username,
          avatarUrl: user.profile?.avatarUrl ?? null,
          isAdmin: user.isAdmin,
          adultConfirmed: Boolean(user.profile?.adultConfirmedAt),
        },
        token,
        refreshToken: nextRefreshToken,
      },
    });
  });

  // Login
  app.post('/v1/auth/login', {
    config: {
      rateLimit: { max: 8, timeWindow: '5 minutes' },
    },
  }, async (request) => {
    const body = loginSchema.parse(request.body);
    const isDbConnected = await checkDatabaseConnection();
    if (!isDbConnected) {
      const username = body.email.split('@')[0] || 'lector';
      const token = accessToken(`user-${username}`, body.email);
      return {
        data: {
          user: {
            id: `user-${username}`,
            email: body.email,
            username,
            displayName: username,
            isAdmin: false,
            adultConfirmed: false,
          },
          token,
          refreshToken: await issueRefreshSession(`user-${username}`, false),
        },
      };
    }

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { profile: true },
    });

    const passwordResult = user ? await verifyPassword(body.password, user.passwordHash) : null;
    if (!user || user.accountStatus !== 'active' || user.isPlaceholder || user.deletedAt || !passwordResult?.valid) {
      throw new AppError('INVALID_CREDENTIALS', 'Credenciales incorrectas.', 401);
    }

    if (passwordResult.needsRehash) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(body.password) },
      });
    }

    const token = accessToken(user.id, user.email);
    const nextRefreshToken = await issueRefreshSession(user.id, true);

    return {
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.profile?.displayName ?? user.username,
          avatarUrl: user.profile?.avatarUrl ?? null,
          isAdmin: user.isAdmin,
          adultConfirmed: Boolean(user.profile?.adultConfirmedAt),
        },
        token,
        refreshToken: nextRefreshToken,
      },
    };
  });

  // Refresh Token Rotation
  app.post('/v1/auth/refresh', async (request) => {
    const body = refreshTokenSchema.parse(request.body);
    if (!body.refreshToken) {
      throw new AppError('INVALID_TOKEN', 'Token de refresco no proporcionado.', 400);
    }

    const decoded = verifyToken(body.refreshToken, 'refresh');
    if (!decoded) throw new AppError('INVALID_TOKEN', 'El token de refresco no es valido o ha expirado.', 401);

    if (!(await checkDatabaseConnection())) {
      return {
        data: {
          token: accessToken(decoded.userId, decoded.email),
          refreshToken: await issueRefreshSession(decoded.userId, false),
        },
      };
    }

    const session = await prisma.refreshSession.findFirst({
      where: {
        tokenHash: refreshTokenHash(body.refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { accountStatus: 'active', deletedAt: null },
      },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!session) throw new AppError('INVALID_TOKEN', 'El token de refresco no es valido o ha expirado.', 401);

    const newRefreshToken = refreshToken(session.user.id);
    await prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (revoked.count !== 1) throw new AppError('INVALID_TOKEN', 'El token de refresco ya fue utilizado.', 401);
      await tx.refreshSession.create({
        data: {
          userId: session.user.id,
          tokenHash: refreshTokenHash(newRefreshToken),
          expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
        },
      });
    });

    return {
      data: {
        token: accessToken(session.user.id, session.user.email),
        refreshToken: newRefreshToken,
      },
    };
  });

  // Logout
  app.post('/v1/auth/logout', async (request) => {
    const body = z.object({ refreshToken: z.string().optional() }).parse(request.body ?? {});
    if (body.refreshToken && (await checkDatabaseConnection())) {
      await prisma.refreshSession.updateMany({
        where: { tokenHash: refreshTokenHash(body.refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { data: { success: true, message: 'Sesión cerrada correctamente.' } };
  });

  // Logout All
  app.post('/v1/auth/logout-all', async (request) => {
    const user = await requireUser(request);
    if (await checkDatabaseConnection()) {
      await prisma.refreshSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { data: { success: true, message: 'Se cerraron todas las sesiones activas.' } };
  });

  // Forgot Password
  app.post('/v1/auth/forgot-password', (request) => {
    forgotPasswordSchema.parse(request.body);
    throw new AppError('NOT_IMPLEMENTED', 'La recuperacion de contrasena aun no esta disponible.', 501);
  });

  // Reset Password
  app.post('/v1/auth/reset-password', (request) => {
    resetPasswordSchema.parse(request.body);
    throw new AppError('NOT_IMPLEMENTED', 'La recuperacion de contrasena aun no esta disponible.', 501);
  });

  // Get current user profile
  app.get('/v1/auth/me', async (request) => {
    const authenticated = await requireUser(request);
    if (await checkDatabaseConnection()) {
      const user = await prisma.user.findUnique({
        where: { id: authenticated.id },
        include: { profile: true },
      });
      if (user) {
        return {
          data: {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.profile?.displayName ?? user.username,
            bio: user.profile?.bio ?? '',
            avatarUrl: user.profile?.avatarUrl ?? null,
            isAdmin: user.isAdmin,
            adultConfirmed: Boolean(user.profile?.adultConfirmedAt),
          },
        };
      }
    }
    return { data: { id: authenticated.id, email: authenticated.email ?? '', username: authenticated.email?.split('@')[0] ?? authenticated.id, displayName: authenticated.email?.split('@')[0] ?? 'Usuario', bio: '', isAdmin: false, adultConfirmed: false } };
  });

  app.patch('/v1/auth/me', async (request) => {
    const authenticated = await requireUser(request);
    const userId = authenticated.id;
    const body = profileUpdateSchema.parse(request.body);
    if (await checkDatabaseConnection()) {
      const update: { displayName?: string; bio?: string; avatarUrl?: string | null } = {};
      if (body.displayName !== undefined) update.displayName = body.displayName;
      if (body.bio !== undefined) update.bio = body.bio;
      if (body.avatarUrl !== undefined) update.avatarUrl = body.avatarUrl;
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update,
        create: {
          userId,
          displayName: body.displayName ?? 'Usuario',
          bio: body.bio ?? '',
          avatarUrl: body.avatarUrl ?? null,
          locale: 'es',
        },
      });
      return {
        data: {
          displayName: profile.displayName,
          bio: profile.bio ?? '',
          avatarUrl: profile.avatarUrl ?? null,
        },
      };
    }
    return {
      data: {
        displayName: body.displayName ?? 'Usuario',
        bio: body.bio ?? '',
        avatarUrl: body.avatarUrl ?? null,
      },
    };
  });

  app.post('/v1/auth/me/adult-confirmation', async (request) => {
    const authenticated = await requireUser(request);
    const userId = authenticated.id;
    adultConfirmationSchema.parse(request.body);
    if (!(await checkDatabaseConnection())) return { data: { adultConfirmed: true } };
    await prisma.userProfile.upsert({
      where: { userId },
      update: { adultConfirmedAt: new Date() },
      create: { userId, displayName: 'Usuario', locale: 'es', adultConfirmedAt: new Date() },
    });
    return { data: { adultConfirmed: true } };
  });
}
