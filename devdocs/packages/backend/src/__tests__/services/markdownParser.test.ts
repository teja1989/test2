import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

vi.mock('fs/promises');

import fs from 'fs/promises';
import { parseMarkdownFile, renderMarkdown } from '../../services/markdownParser.js';

const mockReadFile = vi.mocked(fs.readFile);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('parseMarkdownFile', () => {
  it('extracts title from YAML frontmatter', async () => {
    mockReadFile.mockResolvedValue('---\ntitle: Order Lifecycle Guide\n---\nContent here' as any);
    const doc = await parseMarkdownFile('/repo/docs/guide.md', 'oms-docs', '/repo');
    expect(doc.title).toBe('Order Lifecycle Guide');
  });

  it('falls back to filename (without extension) when no frontmatter title', async () => {
    mockReadFile.mockResolvedValue('# Content without frontmatter' as any);
    const doc = await parseMarkdownFile('/repo/docs/order-fulfillment.md', 'oms-docs', '/repo');
    expect(doc.title).toBe('order-fulfillment');
  });

  it('falls back to filename when frontmatter title is empty', async () => {
    mockReadFile.mockResolvedValue('---\ntitle: ""\n---\nContent' as any);
    const doc = await parseMarkdownFile('/repo/docs/returns-policy.md', 'oms-docs', '/repo');
    expect(doc.title).toBe('returns-policy');
  });

  it('extracts tags array from frontmatter', async () => {
    mockReadFile.mockResolvedValue('---\ntags: [orders, fulfillment, api]\n---\nContent' as any);
    const doc = await parseMarkdownFile('/repo/docs/guide.md', 'oms-docs', '/repo');
    expect(doc.tags).toEqual(['orders', 'fulfillment', 'api']);
  });

  it('returns empty tags array when none in frontmatter', async () => {
    mockReadFile.mockResolvedValue('# Just a heading\nContent' as any);
    const doc = await parseMarkdownFile('/repo/docs/guide.md', 'oms-docs', '/repo');
    expect(doc.tags).toEqual([]);
  });

  it('returns empty tags when frontmatter tags is not an array', async () => {
    mockReadFile.mockResolvedValue('---\ntags: "not-an-array"\n---\nContent' as any);
    const doc = await parseMarkdownFile('/repo/docs/guide.md', 'oms-docs', '/repo');
    expect(doc.tags).toEqual([]);
  });

  it('sets type to markdown', async () => {
    mockReadFile.mockResolvedValue('Content' as any);
    const doc = await parseMarkdownFile('/repo/docs/guide.md', 'oms-docs', '/repo');
    expect(doc.type).toBe('markdown');
  });

  it('sets repo to the given repo name', async () => {
    mockReadFile.mockResolvedValue('Content' as any);
    const doc = await parseMarkdownFile('/repo/docs/guide.md', 'oms-docs', '/repo');
    expect(doc.repo).toBe('oms-docs');
  });

  it('computes relative path from basePath', async () => {
    mockReadFile.mockResolvedValue('Content' as any);
    const doc = await parseMarkdownFile('/repo/docs/sub/guide.md', 'oms-docs', '/repo');
    expect(doc.path).toBe('docs/sub/guide.md');
  });

  it('generates a deterministic SHA-256 id from repo:relativePath', async () => {
    mockReadFile.mockResolvedValue('Content' as any);
    const doc = await parseMarkdownFile('/repo/docs/guide.md', 'oms-docs', '/repo');
    const expected = crypto.createHash('sha256').update('oms-docs:docs/guide.md').digest('hex');
    expect(doc.id).toBe(expected);
  });

  it('produces the same id on repeated calls for the same file', async () => {
    mockReadFile.mockResolvedValue('Content' as any);
    const [doc1, doc2] = await Promise.all([
      parseMarkdownFile('/repo/docs/guide.md', 'oms-docs', '/repo'),
      parseMarkdownFile('/repo/docs/guide.md', 'oms-docs', '/repo'),
    ]);
    expect(doc1.id).toBe(doc2.id);
  });

  it('updatedAt is a valid ISO 8601 date string', async () => {
    mockReadFile.mockResolvedValue('Content' as any);
    const doc = await parseMarkdownFile('/repo/docs/guide.md', 'oms-docs', '/repo');
    expect(() => new Date(doc.updatedAt).toISOString()).not.toThrow();
    expect(doc.updatedAt).toBe(new Date(doc.updatedAt).toISOString());
  });

  it('stores raw markdown (not rendered HTML) in content', async () => {
    mockReadFile.mockResolvedValue('---\ntitle: T\n---\n## Section\nBody text' as any);
    const doc = await parseMarkdownFile('/repo/guide.md', 'r', '/repo');
    expect(doc.content).toContain('## Section');
    expect(doc.content).not.toContain('<h2');
  });
});

describe('renderMarkdown', () => {
  it('renders H1 headings to <h1> tags', () => {
    expect(renderMarkdown('# Hello World')).toContain('<h1');
  });

  it('renders H2 headings to <h2> tags', () => {
    expect(renderMarkdown('## Order Lifecycle')).toContain('<h2');
  });

  it('renders fenced code blocks', () => {
    const html = renderMarkdown('```js\nconsole.log("hi")\n```');
    expect(html).toContain('<code');
  });

  it('renders inline links with correct href', () => {
    const html = renderMarkdown('[OMS Docs](https://docs.example.com)');
    expect(html).toContain('href="https://docs.example.com"');
  });

  it('renders bold text with <strong>', () => {
    expect(renderMarkdown('**important**')).toContain('<strong>');
  });

  it('returns a non-empty string for non-empty input', () => {
    expect(renderMarkdown('some content').length).toBeGreaterThan(0);
  });
});
