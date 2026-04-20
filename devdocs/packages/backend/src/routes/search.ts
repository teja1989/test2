import { Router } from 'express';
import { z } from 'zod';
import { searchDocuments } from '../services/azureAISearch.js';

export const searchRouter = Router();

const querySchema = z.object({
  q: z.string().min(1).max(500),
  repo: z.string().optional(),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

searchRouter.get('/', async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { q, repo, size } = parsed.data;
    const results = await searchDocuments(q, repo, size);
    res.json({ query: q, total: results.length, results });
  } catch (err) {
    next(err);
  }
});
