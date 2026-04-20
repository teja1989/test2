import { Router } from 'express';
import { getRepoConfigs, syncRepo } from '../services/gitSync.js';
import { logger } from '../lib/logger.js';

export const reposRouter = Router();

reposRouter.get('/', (_req, res) => {
  const repos = getRepoConfigs().map(({ name, url }) => ({ name, url }));
  res.json(repos);
});

reposRouter.post('/:name/sync', async (req, res, next) => {
  const { name } = req.params;
  const repo = getRepoConfigs().find((r) => r.name === name);
  if (!repo) {
    res.status(404).json({ error: `Repo '${name}' not configured` });
    return;
  }
  try {
    await syncRepo(repo);
    res.json({ success: true, repo: name });
  } catch (err) {
    logger.error(`Manual sync failed for ${name}:`, err);
    next(err);
  }
});
