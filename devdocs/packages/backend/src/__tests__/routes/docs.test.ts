import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

vi.mock('../../services/azureAISearch.js', () => ({
  listDocuments: vi.fn(),
}));

vi.mock('../../services/markdownParser.js', () => ({
  renderMarkdown: vi.fn((raw: string) => `<p>${raw}</p>`),
}));

// vi.hoisted ensures testConfig exists when the mock factory runs (both are hoisted before imports)
const testConfig = vi.hoisted(() => ({
  DOCS_BASE_PATH: '/nonexistent-placeholder',
  AZURE_SEARCH_ENDPOINT: 'https://test.search.windows.net',
  AZURE_SEARCH_KEY: 'test-key',
  AZURE_SEARCH_INDEX_NAME: 'test-index',
  PORT: 3001,
  NODE_ENV: 'test',
}));

vi.mock('../../lib/config.js', () => ({ config: testConfig }));

import { listDocuments } from '../../services/azureAISearch.js';
import { docsRouter } from '../../routes/docs.js';

const mockListDocuments = vi.mocked(listDocuments);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/docs', docsRouter);
  app.use((_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: 'internal' });
  });
  return app;
}

const sampleDocMeta = {
  id: 'abc123',
  repo: 'oms-docs',
  path: 'guides/order-lifecycle.md',
  title: 'Order Lifecycle',
  type: 'markdown' as const,
  updatedAt: '2024-01-01T00:00:00.000Z',
  tags: ['orders'],
};

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devdocs-docs-test-'));
  // Point the live mock at the real temp directory
  testConfig.DOCS_BASE_PATH = tmpDir;

  await fs.mkdir(path.join(tmpDir, 'oms-docs', 'guides'), { recursive: true });
  await fs.writeFile(
    path.join(tmpDir, 'oms-docs', 'guides', 'orders.md'),
    '## Order Guide\nContent here',
  );
  await fs.writeFile(path.join(tmpDir, 'oms-docs', 'guide.pdf'), Buffer.from('%PDF-1.4 fake'));
  await fs.writeFile(
    path.join(tmpDir, 'oms-docs', 'doc.md'),
    '---\ntitle: Test\n---\n# Heading\nBody',
  );
});

afterAll(async () => {
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/docs', () => {
  it('returns the document list from listDocuments', async () => {
    mockListDocuments.mockResolvedValue([sampleDocMeta]);
    const res = await request(createApp()).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Order Lifecycle');
  });

  it('returns an empty array when there are no documents', async () => {
    mockListDocuments.mockResolvedValue([]);
    const res = await request(createApp()).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 when listDocuments throws', async () => {
    mockListDocuments.mockRejectedValue(new Error('Azure unavailable'));
    const res = await request(createApp()).get('/api/docs');
    expect(res.status).toBe(500);
  });
});

describe('GET /api/docs/:repo/*', () => {
  it('serves a markdown file with html and raw fields', async () => {
    const res = await request(createApp()).get('/api/docs/oms-docs/guides/orders.md');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('html');
    expect(res.body).toHaveProperty('raw', '## Order Guide\nContent here');
  });

  it('serves a PDF file with content-type application/pdf', async () => {
    const res = await request(createApp()).get('/api/docs/oms-docs/guide.pdf');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });

  it('returns the raw markdown content unchanged', async () => {
    const res = await request(createApp()).get('/api/docs/oms-docs/doc.md');
    expect(res.body.raw).toBe('---\ntitle: Test\n---\n# Heading\nBody');
  });

  it('blocks path traversal — Express 5 normalises .. and returns non-200', async () => {
    const res = await request(createApp()).get('/api/docs/oms-docs/../../etc/passwd');
    expect(res.status).not.toBe(200);
  });

  it('returns 500 when the requested file does not exist', async () => {
    const res = await request(createApp()).get('/api/docs/oms-docs/nonexistent-file.md');
    expect(res.status).toBe(500);
  });
});
