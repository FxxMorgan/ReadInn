import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PresignedUploadResult {
  mediaId: string;
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresInSeconds: number;
}

export class S3MediaService {
  private s3Client: S3Client | null = null;
  private bucket: string;
  private publicDomain: string;
  private endpoint: string;

  constructor() {
    this.endpoint = process.env['S3_ENDPOINT'] || 'http://localhost:9000';
    this.bucket = process.env['S3_BUCKET'] || 'readinn-media';
    this.publicDomain = process.env['R2_PUBLIC_DOMAIN'] || `${this.endpoint}/${this.bucket}`;

    const accessKeyId = process.env['S3_ACCESS_KEY'];
    const secretAccessKey = process.env['S3_SECRET_KEY'];

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: this.endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  async generatePresignedUploadUrl(
    filename: string,
    mimeType: string,
    purpose: 'cover' | 'avatar' | 'chapter'
  ): Promise<PresignedUploadResult> {
    const mediaId = `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const extension = filename.split('.').pop() || 'jpg';
    const key = `${purpose}s/${mediaId}.${extension}`;
    const expiresInSeconds = 900; // 15 minutos

    const publicUrl = `${this.publicDomain}/${key}`;

    if (this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: mimeType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });

      return {
        mediaId,
        uploadUrl,
        publicUrl,
        key,
        expiresInSeconds,
      };
    }

    // Graceful fallback for offline testing
    const uploadUrl = `${this.endpoint}/${this.bucket}/${key}?mockSigned=true`;
    return {
      mediaId,
      uploadUrl,
      publicUrl,
      key,
      expiresInSeconds,
    };
  }
}

export const s3MediaService = new S3MediaService();
