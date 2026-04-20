import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../../services/azureAISearch.js', () => ({
  searchDocuments: vi.fn(),
}));

import { searchDocuments } from '../../services/azureAISearch.js';
import { searchRouter } from '../../routes/search.js';

const mockSearchDocuments = vi.mocked(searchDocuments);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/search', searchRouter);
  // Express 5 error handler
  app.use((_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: 'internal' });
  });
  return app;
}

const sampleHit = {
  id: 'abc',
  repo: 'oms-docs',
  path: 'guides/orders.md',
  title: 'Order Guide',
  content: 'How to manage orders in the OMS.',
  type: 'markdown' as const,
  updatedAt: '2024-01-01T00:00:00.000Z',
  tags: ['orders'],
  score: 0.9,
  highlights: ['<mark>order</mark> management'],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchDocuments.mockResolvedValue([]);
});

describe('GET /api/search', () => {
  it('returns 400 when the q param is missing', async () => {
    const res = await request(createApp()).get('/api/search');
    expect(res.status).toBe(400);
  });

  it('returns 400 when q is an empty string', async () => {
    const res = await request(createApp()).get('/api/search?q=');
    expect(res.status).toBe(400);
  });

  it('returns 400 when q exceeds 500 characters', async () => {
    const q = 'a'.repeat(501);
    const res = await request(createApp()).get(`/api/search?q=${q}`);
    expect(res.status).toBe(400);
  });

  it('returns 200 with results for a valid query', async () => {
    mockSearchDocuments.mockResolvedValue([sampleHit]);
    const res = await request(createApp()).get('/api/search?q=order');
    expect(res.status).toBe(200);
    expect(res.body.query).toBe('order');
    expect(res.body.total).toBe(1);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].title).toBe('Order Guide');
  });

  it('passes the repo filter to searchDocuments when provided', async () => {
    const res = await request(createApp()).get('/api/search?q=order&repo=oms-docs');
    expect(res.status).toBe(200);
    expect(mockSearchDocuments).toHaveBeenCalledWith('order', 'oms-docs', 20);
  });

  it('passes undefined repo when not provided', async () => {
    await request(createApp()).get('/api/search?q=order');
    expect(mockSearchDocuments).toHaveBeenCalledWith('order', undefined, 20);
  });

  it('respects custom size parameter (capped at 100)', async () => {
    await request(createApp()).get('/api/search?q=order&size=10');
    expect(mockSearchDocuments).toHaveBeenCalledWith('order', undefined, 10);
  });

  it('uses default size of 20 when size is not provided', async () => {
    await request(createApp()).get('/api/search?q=order');
    expect(mockSearchDocuments).toHaveBeenCalledWith('order', undefined, 20);
  });

  it('returns 400 when size exceeds 100', async () => {
    const res = await request(createApp()).get('/api/search?q=order&size=200');
    expect(res.status).toBe(400);
  });

  it('returns 200 with empty results when nothing matches', async () => {
    mockSearchDocuments.mockResolvedValue([]);
    const res = await request(createApp()).get('/api/search?q=nonexistent-xyz');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.results).toEqual([]);
  });

  it('returns 500 when searchDocuments throws', async () => {
    mockSearchDocuments.mockRejectedValue(new Error('Azure Search unavailable'));
    const res = await request(createApp()).get('/api/search?q=order');
    expect(res.status).toBe(500);
  });

  it('response includes query, total, and results fields', async () => {
    mockSearchDocuments.mockResolvedValue([sampleHit]);
    const res = await request(createApp()).get('/api/search?q=order');
    expect(res.body).toHaveProperty('query');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('results');
  });
});
