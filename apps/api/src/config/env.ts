import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url().optional(),
  APP_WEB_URL: z.string().url().default('http://localhost:8080'),
  TRUSTED_PROXY_IPS: z.string().default('127.0.0.1,::1').transform((value) =>
    value.split(',').map((item) => item.trim()).filter(Boolean)),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  R2_PUBLIC_DOMAIN: z.string().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  ANALYTICS_SALT: z.string().min(16).optional(),
  READINN_FIXTURE_MODE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  CACHE_ENABLED: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  CACHE_DIR: z.string().default('.cache/readinn'),
  CACHE_TTL_SECONDS: z.coerce.number().int().min(30).max(86400).default(900),
}).superRefine((value, context) => {
  if (!value.READINN_FIXTURE_MODE && !value.JWT_SECRET) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_SECRET'],
      message: 'JWT_SECRET es obligatorio fuera del modo fixture.',
    });
  }
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(env);
}
