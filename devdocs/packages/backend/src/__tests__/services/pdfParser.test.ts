import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

vi.mock('fs/promises');
vi.mock('pdf-parse', () => ({
  default: vi.fn().mockResolvedValue({ text: 'Extracted PDF text content from OMS guide.' }),
}));

import fs from 'fs/promises';
import { parsePdfFile } from '../../services/pdfParser.js';

const mockReadFile = vi.mocked(fs.readFile);

beforeEach(() => {
  vi.clearAllMocks();
  mockReadFile.mockResolvedValue(Buffer.from('%PDF-1.4 fake pdf bytes') as any);
});

describe('parsePdfFile', () => {
  it('extracts text content via pdf-parse', async () => {
    const doc = await parsePdfFile('/repo/docs/guide.pdf', 'oms-docs', '/repo');
    expect(doc.content).toBe('Extracted PDF text content from OMS guide.');
  });

  it('uses the filename without extension as title', async () => {
    const doc = await parsePdfFile('/repo/docs/order-fulfillment-guide.pdf', 'oms-docs', '/repo');
    expect(doc.title).toBe('order-fulfillment-guide');
  });

  it('sets type to pdf', async () => {
    const doc = await parsePdfFile('/repo/docs/guide.pdf', 'oms-docs', '/repo');
    expect(doc.type).toBe('pdf');
  });

  it('always returns an empty tags array', async () => {
    const doc = await parsePdfFile('/repo/docs/guide.pdf', 'oms-docs', '/repo');
    expect(doc.tags).toEqual([]);
  });

  it('sets repo to the provided repo name', async () => {
    const doc = await parsePdfFile('/repo/docs/guide.pdf', 'oms-docs', '/repo');
    expect(doc.repo).toBe('oms-docs');
  });

  it('computes relative path from basePath', async () => {
    const doc = await parsePdfFile('/repo/docs/sub/returns.pdf', 'oms-docs', '/repo');
    expect(doc.path).toBe('docs/sub/returns.pdf');
  });

  it('generates a deterministic SHA-256 id from repo:relativePath', async () => {
    const doc = await parsePdfFile('/repo/docs/guide.pdf', 'oms-docs', '/repo');
    const expected = crypto.createHash('sha256').update('oms-docs:docs/guide.pdf').digest('hex');
    expect(doc.id).toBe(expected);
  });

  it('produces the same id on repeated calls for the same file', async () => {
    const [doc1, doc2] = await Promise.all([
      parsePdfFile('/repo/docs/guide.pdf', 'oms-docs', '/repo'),
      parsePdfFile('/repo/docs/guide.pdf', 'oms-docs', '/repo'),
    ]);
    expect(doc1.id).toBe(doc2.id);
  });

  it('produces a different id for different paths', async () => {
    const doc1 = await parsePdfFile('/repo/docs/guide-a.pdf', 'oms-docs', '/repo');
    const doc2 = await parsePdfFile('/repo/docs/guide-b.pdf', 'oms-docs', '/repo');
    expect(doc1.id).not.toBe(doc2.id);
  });

  it('updatedAt is a valid ISO 8601 date string', async () => {
    const doc = await parsePdfFile('/repo/docs/guide.pdf', 'oms-docs', '/repo');
    expect(doc.updatedAt).toBe(new Date(doc.updatedAt).toISOString());
  });

  it('reads the file from the given path', async () => {
    await parsePdfFile('/repo/docs/guide.pdf', 'oms-docs', '/repo');
    expect(mockReadFile).toHaveBeenCalledWith('/repo/docs/guide.pdf');
  });
});
