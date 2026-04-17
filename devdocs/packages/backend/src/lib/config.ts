import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ES_NODE: z.string().url().default('http://localhost:9200'),
  ES_INDEX: z.string().min(1).default('devdocs'),
  DOCS_BASE_PATH: z.string().min(1).default('./repos'),
  WEBHOOK_SECRET: z.string().min(1).default('changeme'),
  CORS_ORIGIN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
