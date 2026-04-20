import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures these fns are available when the mock factory runs (which is hoisted before imports)
const mocks = vi.hoisted(() => ({
  mergeOrUploadDocuments: vi.fn().mockResolvedValue({}),
  search: vi.fn(),
  createOrUpdateIndex: vi.fn().mockResolvedValue({}),
}));

vi.mock('@azure/search-documents', () => ({
  AzureKeyCredential: vi.fn().mockReturnValue({}),
  SearchClient: vi.fn().mockReturnValue({
    mergeOrUploadDocuments: mocks.mergeOrUploadDocuments,
    search: mocks.search,
  }),
  SearchIndexClient: vi.fn().mockReturnValue({
    createOrUpdateIndex: mocks.createOrUpdateIndex,
  }),
}));

import {
  indexDocument,
  listDocuments,
  searchDocuments,
  ensureIndex,
  type DocDocument,
} from '../../services/azureAISearch.js';

const baseDoc: DocDocument = {
  id: 'deadbeef',
  repo: 'oms-docs',
  path: 'guides/order-lifecycle.md',
  title: 'Order Lifecycle',
  content: 'Orders move from pending → confirmed → shipped → delivered.',
  type: 'markdown',
  updatedAt: '2024-01-15T10:00:00.000Z',
  tags: ['orders', 'fulfillment'],
};

function makeAsyncIterable<T>(items: T[]) {
  return (async function* () {
    for (const item of items) yield item;
  })();
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── ensureIndex ────────────────────────────────────────────────────────────────

describe('ensureIndex', () => {
  it('calls createOrUpdateIndex with the configured index name', async () => {
    await ensureIndex();
    expect(mocks.createOrUpdateIndex).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'test-index' }),
    );
  });

  it('includes an id field marked as key', async () => {
    await ensureIndex();
    const [arg] = mocks.createOrUpdateIndex.mock.calls[0] as any[];
    const idField = arg.fields.find((f: any) => f.name === 'id');
    expect(idField).toBeDefined();
    expect(idField.key).toBe(true);
  });

  it('includes searchable title and content fields', async () => {
    await ensureIndex();
    const [arg] = mocks.createOrUpdateIndex.mock.calls[0] as any[];
    const names = arg.fields.map((f: any) => f.name);
    expect(names).toContain('title');
    expect(names).toContain('content');
    const titleField = arg.fields.find((f: any) => f.name === 'title');
    const contentField = arg.fields.find((f: any) => f.name === 'content');
    expect(titleField.searchable).toBe(true);
    expect(contentField.searchable).toBe(true);
  });

  it('includes filterable repo, path, type, and tags fields', async () => {
    await ensureIndex();
    const [arg] = mocks.createOrUpdateIndex.mock.calls[0] as any[];
    const filterable = arg.fields
      .filter((f: any) => f.filterable)
      .map((f: any) => f.name);
    expect(filterable).toContain('repo');
    expect(filterable).toContain('type');
    expect(filterable).toContain('tags');
  });
});

// ── indexDocument ──────────────────────────────────────────────────────────────

describe('indexDocument', () => {
  it('calls mergeOrUploadDocuments with the document', async () => {
    await indexDocument(baseDoc);
    expect(mocks.mergeOrUploadDocuments).toHaveBeenCalledOnce();
    const [docs] = mocks.mergeOrUploadDocuments.mock.calls[0] as any[][];
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ id: 'deadbeef', title: 'Order Lifecycle' });
  });

  it('converts updatedAt ISO string to a Date object for Azure', async () => {
    await indexDocument(baseDoc);
    const [docs] = mocks.mergeOrUploadDocuments.mock.calls[0] as any[][];
    expect(docs[0].updatedAt).toBeInstanceOf(Date);
    expect(docs[0].updatedAt.toISOString()).toBe(baseDoc.updatedAt);
  });

  it('preserves all other DocDocument fields unchanged', async () => {
    await indexDocument(baseDoc);
    const [docs] = mocks.mergeOrUploadDocuments.mock.calls[0] as any[][];
    expect(docs[0].repo).toBe('oms-docs');
    expect(docs[0].content).toBe(baseDoc.content);
    expect(docs[0].tags).toEqual(['orders', 'fulfillment']);
  });
});

// ── listDocuments ──────────────────────────────────────────────────────────────

describe('listDocuments', () => {
  it('returns document metadata (no content field)', async () => {
    mocks.search.mockResolvedValue({
      results: makeAsyncIterable([
        {
          document: {
            id: 'deadbeef',
            repo: 'oms-docs',
            path: 'guides/order-lifecycle.md',
            title: 'Order Lifecycle',
            type: 'markdown',
            updatedAt: new Date('2024-01-15T10:00:00.000Z'),
            tags: ['orders'],
          },
        },
      ]),
    });

    const docs = await listDocuments();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ id: 'deadbeef', title: 'Order Lifecycle' });
    expect(docs[0]).not.toHaveProperty('content');
  });

  it('converts Date updatedAt back to ISO string', async () => {
    const date = new Date('2024-06-01T00:00:00.000Z');
    mocks.search.mockResolvedValue({
      results: makeAsyncIterable([
        { document: { ...baseDoc, updatedAt: date } },
      ]),
    });

    const docs = await listDocuments();
    expect(docs[0]?.updatedAt).toBe(date.toISOString());
  });

  it('returns an empty array when there are no documents', async () => {
    mocks.search.mockResolvedValue({ results: makeAsyncIterable([]) });
    const docs = await listDocuments();
    expect(docs).toEqual([]);
  });

  it('queries with select excluding content and orders by title asc', async () => {
    mocks.search.mockResolvedValue({ results: makeAsyncIterable([]) });
    await listDocuments();
    expect(mocks.search).toHaveBeenCalledWith(
      '*',
      expect.objectContaining({
        orderBy: ['title asc'],
        top: 500,
      }),
    );
    const [, opts] = mocks.search.mock.calls[0] as any[];
    expect(opts.select).not.toContain('content');
  });
});

// ── searchDocuments ────────────────────────────────────────────────────────────

describe('searchDocuments', () => {
  it('returns hits with score and highlights', async () => {
    mocks.search.mockResolvedValue({
      results: makeAsyncIterable([
        {
          document: { ...baseDoc, updatedAt: new Date(baseDoc.updatedAt) },
          score: 0.95,
          highlights: { content: ['<mark>order</mark> lifecycle'] },
        },
      ]),
    });

    const hits = await searchDocuments('order lifecycle');
    expect(hits).toHaveLength(1);
    expect(hits[0]?.score).toBe(0.95);
    expect(hits[0]?.highlights).toContain('<mark>order</mark> lifecycle');
  });

  it('returns an empty array when no documents match', async () => {
    mocks.search.mockResolvedValue({ results: makeAsyncIterable([]) });
    expect(await searchDocuments('nonexistent-xyz')).toEqual([]);
  });

  it('applies a repo eq filter when repo param is provided', async () => {
    mocks.search.mockResolvedValue({ results: makeAsyncIterable([]) });
    await searchDocuments('returns', 'oms-docs');
    expect(mocks.search).toHaveBeenCalledWith(
      'returns',
      expect.objectContaining({ filter: "repo eq 'oms-docs'" }),
    );
  });

  it('sets filter to undefined when repo is omitted', async () => {
    mocks.search.mockResolvedValue({ results: makeAsyncIterable([]) });
    await searchDocuments('returns');
    expect(mocks.search).toHaveBeenCalledWith(
      'returns',
      expect.objectContaining({ filter: undefined }),
    );
  });

  it("escapes single quotes in repo name to prevent OData injection", async () => {
    mocks.search.mockResolvedValue({ results: makeAsyncIterable([]) });
    await searchDocuments('test', "o'malley-repo");
    expect(mocks.search).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({ filter: "repo eq 'o''malley-repo'" }),
    );
  });

  it('respects the size parameter', async () => {
    mocks.search.mockResolvedValue({ results: makeAsyncIterable([]) });
    await searchDocuments('order', undefined, 5);
    expect(mocks.search).toHaveBeenCalledWith(
      'order',
      expect.objectContaining({ top: 5 }),
    );
  });

  it('uses <mark> highlight tags', async () => {
    mocks.search.mockResolvedValue({ results: makeAsyncIterable([]) });
    await searchDocuments('order');
    expect(mocks.search).toHaveBeenCalledWith(
      'order',
      expect.objectContaining({
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
      }),
    );
  });

  it('merges content and title highlights into one array', async () => {
    mocks.search.mockResolvedValue({
      results: makeAsyncIterable([
        {
          document: { ...baseDoc, updatedAt: new Date(baseDoc.updatedAt) },
          score: 1.0,
          highlights: {
            content: ['<mark>order</mark> content snippet'],
            title: ['<mark>Order</mark> Lifecycle'],
          },
        },
      ]),
    });

    const hits = await searchDocuments('order');
    expect(hits[0]?.highlights).toContain('<mark>order</mark> content snippet');
    expect(hits[0]?.highlights).toContain('<mark>Order</mark> Lifecycle');
  });
});
