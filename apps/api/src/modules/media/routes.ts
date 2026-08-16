import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { s3MediaService } from './s3-storage.js';

const uploadIntentSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  sizeBytes: z.number().max(5 * 1024 * 1024, 'El tamaño máximo permitido es 5 MB'),
  purpose: z.enum(['cover', 'avatar', 'chapter']),
});

interface MediaRecord {
  mediaId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  purpose: string;
  status: 'pending' | 'ready';
  uploadUrl: string;
  publicUrl: string;
  key: string;
  createdAt: string;
}

const mockMediaStore = new Map<string, MediaRecord>();

export function registerMediaRoutes(app: FastifyInstance): void {
  app.addContentTypeParser(
    ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    { parseAs: 'buffer', bodyLimit: 5 * 1024 * 1024 },
    (_request, body, done) => done(null, body),
  );

  // Request Presigned Upload Intent URL (Cloudflare R2 / MinIO / S3)
  app.post('/v1/media/upload-intent', async (request, reply) => {
    const body = uploadIntentSchema.parse(request.body);

    const presigned = await s3MediaService.generatePresignedUploadUrl(
      body.filename,
      body.mimeType,
      body.purpose
    );

    const record: MediaRecord = {
      mediaId: presigned.mediaId,
      filename: body.filename,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      purpose: body.purpose,
      status: 'pending',
      uploadUrl: presigned.uploadUrl,
      publicUrl: presigned.publicUrl,
      key: presigned.key,
      createdAt: new Date().toISOString(),
    };

    mockMediaStore.set(presigned.mediaId, record);

    return reply.status(201).send({
      data: {
        mediaId: record.mediaId,
        uploadUrl: record.uploadUrl,
        uploadPath: `/v1/media/${record.mediaId}/upload`,
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
      const record = mockMediaStore.get(request.params.mediaId);
      if (!record) {
        return reply.status(404).send({
          error: { code: 'MEDIA_NOT_FOUND', message: 'No se encontro la carga solicitada.' },
        });
      }
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
        return reply.status(422).send({
          error: { code: 'INVALID_MEDIA', message: 'La imagen esta vacia o no es valida.' },
        });
      }
      if (request.body.length > record.sizeBytes) {
        return reply.status(413).send({
          error: { code: 'MEDIA_TOO_LARGE', message: 'La imagen supera el tamano declarado.' },
        });
      }
      await s3MediaService.uploadObject(record.key, record.mimeType, request.body);
      return reply.status(204).send();
    },
  );

  // Confirm upload completed
  app.post<{ Params: { mediaId: string } }>('/v1/media/:mediaId/confirm', async (request) => {
    const { mediaId } = request.params;
    const record = mockMediaStore.get(mediaId);

    if (!record) {
      const publicDomain = process.env['R2_PUBLIC_DOMAIN'] || 'https://read.cypher.cl';
      return {
        data: {
          mediaId,
          status: 'ready',
          publicUrl: `${publicDomain}/covers/${mediaId}.png`,
        },
      };
    }

    record.status = 'ready';
    mockMediaStore.set(mediaId, record);

    return {
      data: {
        mediaId: record.mediaId,
        status: record.status,
        publicUrl: record.publicUrl,
      },
    };
  });
}
