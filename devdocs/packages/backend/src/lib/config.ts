import { z } from 'zod';

const repoItemSchema = z.object({
  url: z.string().min(1, 'repo url required'),
  name: z.string().min(1, 'repo name required'),
  branch: z.string().default('main'),
});

export type RepoConfig = z.infer<typeof repoItemSchema>;

const envSchema = z.object({
  // ── Core ────────────────────────────────────────────────────────────────────
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ── Elasticsearch ────────────────────────────────────────────────────────────
  ES_NODE: z.string().url().default('http://localhost:9200'),
  ES_INDEX: z.string().min(1).default('devdocs'),

  // ── Git / repos ──────────────────────────────────────────────────────────────
  DOCS_BASE_PATH: z.string().min(1).default('./repos'),
  WEBHOOK_SECRET: z.string().min(1).default('changeme'),
  CORS_ORIGIN: z.string().optional(),
  GITHUB_PAT: z.string().optional(),
  GITHUB_REPOS: z
    .string()
    .default('[]')
    .transform((val, ctx) => {
      try { return JSON.parse(val) as unknown; }
      catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'GITHUB_REPOS must be valid JSON' });
        return z.NEVER;
      }
    })
    .pipe(z.array(repoItemSchema)),

  // ── Microsoft Teams ──────────────────────────────────────────────────────────
  TEAMS_WEBHOOK_URL: z.string().url().optional(),
  APP_URL: z.string().url().optional(),

  // ── Azure Entra ID (SSO) ──────────────────────────────────────────────────
  AZURE_AD_TENANT_ID: z.string().optional(),
  AZURE_AD_CLIENT_ID: z.string().optional(),
  AZURE_AD_CLIENT_SECRET: z.string().optional(),
  AZURE_AD_REDIRECT_URI: z.string().url().optional(),
  SESSION_SECRET: z.string().min(16).default('changeme-replace-in-production!!'),

  // ── Azure OpenAI (Chat assistant) ────────────────────────────────────────────
  AZURE_OPENAI_ENDPOINT: z.string().url().optional(),
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_DEPLOYMENT: z.string().default('gpt-4o'),
  AZURE_OPENAI_API_VERSION: z.string().default('2024-02-01'),
  CHAT_MAX_CONTEXT_DOCS: z.coerce.number().int().min(1).max(20).default(5),
  CHAT_MAX_TOKENS: z.coerce.number().int().min(256).max(4096).default(2048),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
