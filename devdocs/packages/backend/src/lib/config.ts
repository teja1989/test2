import { z } from 'zod';

const repoItemSchema = z.object({
  url: z.string().min(1, 'repo url required'),
  name: z.string().min(1, 'repo name required'),
  branch: z.string().default('main'),
});

// Exported so gitSync.ts can use the inferred type
export type RepoConfig = z.infer<typeof repoItemSchema>;

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ES_NODE: z.string().url().default('http://localhost:9200'),
  ES_INDEX: z.string().min(1).default('devdocs'),
  DOCS_BASE_PATH: z.string().min(1).default('./repos'),
  WEBHOOK_SECRET: z.string().min(1).default('changeme'),
  CORS_ORIGIN: z.string().optional(),

  // GitHub PAT — injected into HTTPS clone/fetch URLs; SSH repos are unaffected
  GITHUB_PAT: z.string().optional(),

  // JSON array of repo objects: [{"url":"...","name":"...","branch":"main"}, ...]
  GITHUB_REPOS: z
    .string()
    .default('[]')
    .transform((val, ctx) => {
      try {
        return JSON.parse(val) as unknown;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'GITHUB_REPOS must be valid JSON' });
        return z.NEVER;
      }
    })
    .pipe(z.array(repoItemSchema)),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
