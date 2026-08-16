import crypto from 'node:crypto';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface CacheRecord<T> {
  key: string;
  tags: string[];
  expiresAt: number;
  value: T;
}

interface CacheOptions {
  enabled: boolean;
  directory: string;
  ttlSeconds: number;
}

class ContentCache {
  private options: CacheOptions = {
    enabled: true,
    directory: path.resolve('.cache/readinn'),
    ttlSeconds: 900,
  };

  private readonly memory = new Map<string, CacheRecord<unknown>>();

  configure(options: CacheOptions): void {
    this.options = { ...options, directory: path.resolve(options.directory) };
    this.memory.clear();
  }

  async remember<T>(key: string, tags: string[], loader: () => Promise<T>): Promise<T> {
    if (!this.options.enabled) return loader();
    const now = Date.now();
    const memoryRecord = this.memory.get(key) as CacheRecord<T> | undefined;
    if (memoryRecord && memoryRecord.expiresAt > now) return memoryRecord.value;

    const diskRecord = await this.read<T>(key);
    if (diskRecord && diskRecord.expiresAt > now) {
      this.memory.set(key, diskRecord);
      return diskRecord.value;
    }

    const value = await loader();
    const record: CacheRecord<T> = {
      key,
      tags: [...new Set(tags)],
      expiresAt: now + this.options.ttlSeconds * 1000,
      value,
    };
    this.memory.set(key, record);
    await this.write(record);
    return value;
  }

  async invalidateTags(tags: string[]): Promise<void> {
    if (!this.options.enabled || tags.length === 0) return;
    const tagSet = new Set(tags);
    for (const [key, record] of this.memory) {
      if (record.tags.some((tag) => tagSet.has(tag))) this.memory.delete(key);
    }

    try {
      await mkdir(this.options.directory, { recursive: true });
      const files = await readdir(this.options.directory);
      await Promise.all(files.filter((file) => file.endsWith('.json')).map(async (file) => {
        const filename = path.join(this.options.directory, file);
        try {
          const record = JSON.parse(await readFile(filename, 'utf8')) as CacheRecord<unknown>;
          if (record.tags.some((tag) => tagSet.has(tag))) await unlink(filename);
        } catch {
          await unlink(filename).catch(() => undefined);
        }
      }));
    } catch {
      // Cache failures must never make books unavailable.
    }
  }

  private filename(key: string): string {
    return path.join(this.options.directory, `${crypto.createHash('sha256').update(key).digest('hex')}.json`);
  }

  private async read<T>(key: string): Promise<CacheRecord<T> | null> {
    try {
      const record = JSON.parse(await readFile(this.filename(key), 'utf8')) as CacheRecord<T>;
      if (record.key !== key) return null;
      if (record.expiresAt <= Date.now()) {
        await unlink(this.filename(key)).catch(() => undefined);
        return null;
      }
      return record;
    } catch {
      return null;
    }
  }

  private async write<T>(record: CacheRecord<T>): Promise<void> {
    try {
      await mkdir(this.options.directory, { recursive: true });
      await writeFile(this.filename(record.key), JSON.stringify(record), 'utf8');
    } catch {
      // The database remains the source of truth when disk is unavailable.
    }
  }
}

export const contentCache = new ContentCache();

export function storyCacheTags(storyId: string, chapterId?: string): string[] {
  return ['catalog', `story:${storyId}`, ...(chapterId ? [`chapter:${chapterId}`] : [])];
}
