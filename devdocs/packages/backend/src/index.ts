import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { ensureIndex } from './services/azureAISearch.js';
import { syncAllRepos } from './services/gitSync.js';
import { startFileWatcher } from './services/fileWatcher.js';
import { initAuthClient } from './services/auth.js';
import { requireAuth } from './middleware/requireAuth.js';
import { docsRouter } from './routes/docs.js';
import { searchRouter } from './routes/search.js';
import { reposRouter } from './routes/repos.js';
import { webhooksRouter } from './routes/webhooks.js';
import { authRouter } from './routes/auth.js';
import { chatRouter } from './routes/chat.js';

const app = express();

app.use(cors({ origin: config.CORS_ORIGIN ?? '*', credentials: true }));
app.use(morgan('dev'));

// Sessions — required before auth routes
app.use(
  session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
  }),
);

// Raw body for webhook HMAC — must precede json()
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());

// Auth routes are unprotected (login/callback/logout/me)
app.use('/api/auth', authRouter);

// Protected API surface
app.use('/api/docs', requireAuth, docsRouter);
app.use('/api/search', requireAuth, searchRouter);
app.use('/api/repos', requireAuth, reposRouter);
app.use('/api/chat', requireAuth, chatRouter);

// Webhook uses HMAC — not session auth
app.use('/api/webhooks', webhooksRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error(err.message, err.stack);
    res.status(500).json({ error: err.message });
  },
);

async function main() {
  // Discover Azure AD OIDC metadata (no-op when env vars are absent)
  await initAuthClient().catch((e: unknown) => logger.warn('SSO init warning:', e));

  await ensureIndex();

  if (config.NODE_ENV !== 'test') {
    await syncAllRepos().catch((e: unknown) => logger.error('Initial sync failed', e));
    startFileWatcher();
  }

  app.listen(config.PORT, () => {
    logger.info(`Server listening on port ${config.PORT}`);
  });
}

main().catch((e: unknown) => {
  logger.error('Fatal startup error', e);
  process.exit(1);
});

export default app;
