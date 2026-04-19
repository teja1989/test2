import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { listDocuments } from '../services/azureAISearch.js';
import { renderMarkdown } from '../services/markdownParser.js';
import { config } from '../lib/config.js';

export const docsRouter = Router();

docsRouter.get('/', async (_req, res, next) => {
  try {
    const docs = await listDocuments();
    res.json(docs);
  } catch (err) {
    next(err);
  }
});

docsRouter.get('/:repo/*', async (req, res, next) => {
  try {
    const { repo } = req.params;
    // Express 5 wildcard is available as params['0'] (unnamed) or via the splat
    const docPath = (req.params as Record<string, string>)['0'] ?? '';
    const fullPath = path.resolve(config.DOCS_BASE_PATH, repo, docPath);

    // Guard path traversal
    const basePath = path.resolve(config.DOCS_BASE_PATH, repo);
    if (!fullPath.startsWith(basePath)) {
      res.status(400).json({ error: 'Invalid path' });
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();

    if (ext === '.pdf') {
      const buffer = await fs.readFile(fullPath);
      res.type('application/pdf').send(buffer);
      return;
    }

    const raw = await fs.readFile(fullPath, 'utf-8');
    const html = renderMarkdown(raw);
    res.json({ html, raw });
  } catch (err) {
    next(err);
  }
});
