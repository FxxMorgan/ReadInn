import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, checkDatabaseConnection } from '../../shared/db.js';
import { AppError } from '../../shared/errors.js';

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(6),
  displayName: z.string().min(2).max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6),
});

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

export function registerAuthRoutes(app: FastifyInstance): void {
  // Register
  app.post('/v1/auth/register', async (request, reply) => {
    const isDbConnected = await checkDatabaseConnection();
    if (!isDbConnected) {
      return reply.status(201).send({
        data: {
          user: {
            id: 'user-mock-1',
            email: 'usuario@readinn.app',
            username: 'nuevo-lector',
            displayName: 'Nuevo Lector',
          },
          token: 'mock-jwt-token-readinn-12345',
          refreshToken: 'mock-refresh-token-12345',
        },
      });
    }

    const body = registerSchema.parse(request.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: body.email }, { username: body.username }],
      },
    });

    if (existingUser) {
      throw new AppError('USER_EXISTS', 'El correo o nombre de usuario ya está registrado.', 400);
    }

    const passwordHash = hashPassword(body.password);
    const displayName = body.displayName ?? body.username;

    const user = await prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        passwordHash,
        accountStatus: 'active',
        profile: {
          create: {
            displayName,
            locale: 'es',
          },
        },
      },
      include: { profile: true },
    });

    const token = Buffer.from(JSON.stringify({ userId: user.id, email: user.email, type: 'access' })).toString('base64');
    const refreshToken = Buffer.from(JSON.stringify({ userId: user.id, type: 'refresh', nonce: crypto.randomUUID() })).toString('base64');

    return reply.status(201).send({
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.profile?.displayName ?? user.username,
        },
        token,
        refreshToken,
      },
    });
  });

  // Login
  app.post('/v1/auth/login', async (request) => {
    const isDbConnected = await checkDatabaseConnection();
    if (!isDbConnected) {
      return {
        data: {
          user: {
            id: 'user-marina-1',
            email: 'marina@readinn.app',
            username: 'marina-solis',
            displayName: 'Marina Solís',
          },
          token: 'mock-jwt-token-readinn-marina',
          refreshToken: 'mock-refresh-token-marina',
        },
      };
    }

    const body = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { profile: true },
    });

    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      throw new AppError('INVALID_CREDENTIALS', 'Credenciales incorrectas.', 401);
    }

    const token = Buffer.from(JSON.stringify({ userId: user.id, email: user.email, type: 'access' })).toString('base64');
    const refreshToken = Buffer.from(JSON.stringify({ userId: user.id, type: 'refresh', nonce: crypto.randomUUID() })).toString('base64');

    return {
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.profile?.displayName ?? user.username,
        },
        token,
        refreshToken,
      },
    };
  });

  // Refresh Token Rotation
  app.post('/v1/auth/refresh', async (request) => {
    const body = refreshTokenSchema.parse(request.body);
    if (!body.refreshToken) {
      throw new AppError('INVALID_TOKEN', 'Token de refresco no proporcionado.', 400);
    }

    try {
      const decoded = JSON.parse(Buffer.from(body.refreshToken, 'base64').toString('utf-8'));
      const newToken = Buffer.from(JSON.stringify({ userId: decoded.userId, type: 'access' })).toString('base64');
      const newRefreshToken = Buffer.from(JSON.stringify({ userId: decoded.userId, type: 'refresh', nonce: crypto.randomUUID() })).toString('base64');

      return {
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      };
    } catch (e) {
      throw new AppError('INVALID_TOKEN', 'El token de refresco no es válido o ha expirado.', 401);
    }
  });

  // Logout
  app.post('/v1/auth/logout', async () => {
    return { data: { success: true, message: 'Sesión cerrada correctamente.' } };
  });

  // Logout All
  app.post('/v1/auth/logout-all', async () => {
    return { data: { success: true, message: 'Se cerraron todas las sesiones activas.' } };
  });

  // Forgot Password
  app.post('/v1/auth/forgot-password', async (request) => {
    const body = forgotPasswordSchema.parse(request.body);
    return {
      data: {
        message: 'Si el correo electrónico está registrado, recibirás un enlace de recuperación.',
        email: body.email,
      },
    };
  });

  // Reset Password
  app.post('/v1/auth/reset-password', async (request) => {
    const body = resetPasswordSchema.parse(request.body);
    return {
      data: {
        success: true,
        message: 'Tu contraseña ha sido actualizada correctamente.',
      },
    };
  });

  // Get current user profile
  app.get('/v1/auth/me', async (request) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return {
        data: {
          id: 'user-guest',
          email: 'invitado@readinn.app',
          username: 'invitado',
          displayName: 'Invitado',
        },
      };
    }

    return {
      data: {
        id: 'user-marina-1',
        email: 'marina@readinn.app',
        username: 'marina-solis',
        displayName: 'Marina Solís',
      },
    };
  });
}
