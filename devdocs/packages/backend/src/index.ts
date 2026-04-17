import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { ensureIndex } from './services/elasticsearch.js';
import { syncAllRepos } from './services/gitSync.js';
import { startFileWatcher } from './services/fileWatcher.js';
import { docsRouter } from './routes/docs.js';
import { searchRouter } from './routes/search.js';
import { reposRouter } from './routes/repos.js';
import { webhooksRouter } from './routes/webhooks.js';

const app = express();

app.use(cors({ origin: process.env['CORS_ORIGIN'] ?? '*' }));
app.use(morgan('dev'));

// Raw body for webhook signature verification — must precede json()
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use('/api/docs', docsRouter);
app.use('/api/search', searchRouter);
app.use('/api/repos', reposRouter);
app.use('/api/webhooks', webhooksRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error(err.message, err.stack);
    res.status(500).json({ error: err.message });
  },
);

async function main() {
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
