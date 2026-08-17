import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser } from '../../shared/auth-guards.js';
import { checkDatabaseConnection, prisma } from '../../shared/db.js';
import { AppError } from '../../shared/errors.js';
import { s3MediaService } from './s3-storage.js';

const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

const uploadIntentSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  sizeBytes: z.number().int().positive().max(MAX_MEDIA_BYTES, 'El tamaño máximo permitido es 5 MB'),
  purpose: z.enum(['cover', 'avatar', 'chapter']),
});

type MediaStatus = 'pending' | 'ready';

interface FixtureMediaRecord {
  mediaId: string;
  ownerId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  purpose: string;
  status: MediaStatus;
  publicUrl: string;
  key: string;
  createdAt: string;
}

interface OwnedMediaRecord {
  mediaId: string;
  ownerId: string;
  mimeType: string;
  sizeBytes: number;
  key: string;
  status: MediaStatus;
  publicUrl: string;
}

const fixtureMediaStore = new Map<string, FixtureMediaRecord>();

function hasMagicBytes(mimeType: string, body: Buffer): boolean {
  if (mimeType === 'image/png') return body.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (mimeType === 'image/jpeg') return body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimeType === 'image/gif') return body.subarray(0, 6).toString('ascii') === 'GIF89a' || body.subarray(0, 6).toString('ascii') === 'GIF87a';
  return body.subarray(0, 4).toString('ascii') === 'RIFF' && body.subarray(8, 12).toString('ascii') === 'WEBP';
}

function invalidMedia(message: string): AppError {
  return new AppError('INVALID_MEDIA', message, 422);
}

async function loadOwnedMedia(mediaId: string, ownerId: string, connected: boolean): Promise<OwnedMediaRecord | null> {
  if (connected) {
    const record = await prisma.mediaAsset.findFirst({ where: { id: mediaId, ownerId } });
    return record ? { mediaId: record.id, ownerId: record.ownerId, mimeType: record.mimeType, sizeBytes: record.sizeBytes, key: record.objectKey, status: record.status as MediaStatus, publicUrl: record.publicUrl } : null;
  }
  const record = fixtureMediaStore.get(mediaId);
  return record && record.ownerId === ownerId ? record : null;
}

export function registerMediaRoutes(app: FastifyInstance): void {
  app.addContentTypeParser(
    ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    { parseAs: 'buffer', bodyLimit: MAX_MEDIA_BYTES },
    (_request, body, done) => done(null, body),
  );

  app.post('/v1/media/upload-intent', async (request, reply) => {
    const owner = await requireUser(request);
    const body = uploadIntentSchema.parse(request.body);
    const presigned = await s3MediaService.generatePresignedUploadUrl(body.filename, body.mimeType, body.purpose);
    const record = {
      mediaId: presigned.mediaId,
      ownerId: owner.id,
      filename: body.filename,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      purpose: body.purpose,
      status: 'pending' as const,
      publicUrl: presigned.publicUrl,
      key: presigned.key,
      createdAt: new Date().toISOString(),
    };

    if (await checkDatabaseConnection()) {
      await prisma.mediaAsset.create({
        data: {
          id: record.mediaId,
          ownerId: record.ownerId,
          filename: record.filename,
          mimeType: record.mimeType,
          sizeBytes: record.sizeBytes,
          purpose: record.purpose,
          objectKey: record.key,
          publicUrl: record.publicUrl,
        },
      });
    } else {
      fixtureMediaStore.set(record.mediaId, record);
    }

    return reply.status(201).send({
      data: {
        mediaId: record.mediaId,
        // Do not expose the S3 presigned URL. Uploads must pass through the bounded API route.
        uploadPath: `/v1/media/${record.mediaId}/upload`,
        uploadUrl: `/v1/media/${record.mediaId}/upload`,
        publicUrl: record.publicUrl,
        method: 'PUT',
        headers: {
          'Content-Type': body.mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        expiresInSeconds: presigned.expiresInSeconds,
      },
    });
  });

  app.put<{ Params: { mediaId: string }; Body: Buffer }>(
    '/v1/media/:mediaId/upload',
    async (request, reply) => {
      const owner = await requireUser(request);
      const connected = await checkDatabaseConnection();
      const record = await loadOwnedMedia(request.params.mediaId, owner.id, connected);
      if (!record) {
        return reply.status(404).send({ error: { code: 'MEDIA_NOT_FOUND', message: 'No se encontro la carga solicitada.' } });
      }
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) throw invalidMedia('La imagen esta vacia o no es valida.');
      if (request.body.length > record.sizeBytes) {
        return reply.status(413).send({ error: { code: 'MEDIA_TOO_LARGE', message: 'La imagen supera el tamano declarado.' } });
      }
      const contentType = String(request.headers['content-type'] ?? '').split(';')[0];
      if (contentType !== record.mimeType || !hasMagicBytes(record.mimeType, request.body)) {
        throw invalidMedia('El contenido no coincide con el tipo de imagen declarado.');
      }

      await s3MediaService.uploadObject(record.key, record.mimeType, request.body);
      if (connected) {
        await prisma.mediaAsset.update({
          where: { id: record.mediaId },
          data: { status: 'ready', uploadedAt: new Date() },
        });
      } else {
        const fixtureRecord = fixtureMediaStore.get(record.mediaId);
        if (fixtureRecord) {
          fixtureRecord.status = 'ready';
          fixtureMediaStore.set(record.mediaId, fixtureRecord);
        }
      }
      return reply.status(204).send();
    },
  );

  app.post<{ Params: { mediaId: string } }>('/v1/media/:mediaId/confirm', async (request) => {
    const owner = await requireUser(request);
    const connected = await checkDatabaseConnection();
    const record = await loadOwnedMedia(request.params.mediaId, owner.id, connected);
    if (!record) {
      throw new AppError('MEDIA_NOT_FOUND', 'No se encontro la carga solicitada.', 404);
    }
    if (record.status !== 'ready') {
      throw new AppError('MEDIA_NOT_UPLOADED', 'La carga aun no se ha completado.', 409);
    }
    return {
      data: {
        mediaId: record.mediaId,
        status: record.status,
        publicUrl: record.publicUrl,
      },
    };
  });
}
