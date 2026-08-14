import fs from 'node:fs';
import path from 'node:path';
import { buildApp } from './app.js';
import { loadConfig } from './config/env.js';

// Manually parse .env if present
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      const val = vals.join('=').trim();
      const cleanKey = key?.trim();
      if (cleanKey && !process.env[cleanKey]) {
        process.env[cleanKey] = val;
      }
    }
  }
}

const config = loadConfig();
const app = await buildApp(config);

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
