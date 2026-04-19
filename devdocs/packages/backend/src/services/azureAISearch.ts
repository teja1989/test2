import { SearchClient, SearchIndexClient, AzureKeyCredential } from '@azure/search-documents';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';

export interface DocDocument {
  id: string;
  repo: string;
  path: string;
  title: string;
  content: string;
  type: 'markdown' | 'pdf';
  updatedAt: string;
  tags: string[];
}

export interface SearchHit extends DocDocument {
  score: number | null;
  highlights: string[];
}

type AzureDoc = Omit<DocDocument, 'updatedAt'> & { updatedAt: Date | string };

const credential = new AzureKeyCredential(config.AZURE_SEARCH_KEY);

const indexClient = new SearchIndexClient(config.AZURE_SEARCH_ENDPOINT, credential);

const searchClient = new SearchClient<AzureDoc>(
  config.AZURE_SEARCH_ENDPOINT,
  config.AZURE_SEARCH_INDEX_NAME,
  credential,
);

function toDocDocument(doc: AzureDoc): DocDocument {
  return {
    ...doc,
    updatedAt:
      doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export async function ensureIndex(): Promise<void> {
  await indexClient.createOrUpdateIndex({
    name: config.AZURE_SEARCH_INDEX_NAME,
    fields: [
      { name: 'id', type: 'Edm.String', key: true },
      { name: 'repo', type: 'Edm.String', filterable: true },
      { name: 'path', type: 'Edm.String', filterable: true },
      { name: 'title', type: 'Edm.String', searchable: true, sortable: true, analyzerName: 'en.lucene' },
      { name: 'content', type: 'Edm.String', searchable: true, analyzerName: 'en.lucene' },
      { name: 'type', type: 'Edm.String', filterable: true },
      { name: 'updatedAt', type: 'Edm.DateTimeOffset', filterable: true, sortable: true },
      { name: 'tags', type: 'Collection(Edm.String)', filterable: true },
    ],
  });
  logger.info(`Azure Search index ready: ${config.AZURE_SEARCH_INDEX_NAME}`);
}

export async function indexDocument(doc: DocDocument): Promise<void> {
  const azureDoc: AzureDoc = { ...doc, updatedAt: new Date(doc.updatedAt) };
  await searchClient.mergeOrUploadDocuments([azureDoc]);
}

export async function listDocuments(): Promise<Omit<DocDocument, 'content'>[]> {
  const results: Omit<DocDocument, 'content'>[] = [];
  const response = await searchClient.search('*', {
    select: ['id', 'repo', 'path', 'title', 'type', 'updatedAt', 'tags'],
    orderBy: ['title asc'],
    top: 500,
  });

  for await (const result of response.results) {
    const doc = result.document;
    results.push({
      id: doc.id,
      repo: doc.repo,
      path: doc.path,
      title: doc.title,
      type: doc.type,
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
      tags: doc.tags,
    });
  }

  return results;
}

export async function searchDocuments(
  query: string,
  repo?: string,
  size = 20,
): Promise<SearchHit[]> {
  const filter = repo ? `repo eq '${repo.replace(/'/g, "''")}'` : undefined;

  const response = await searchClient.search(query, {
    searchFields: ['title', 'content'],
    select: ['id', 'repo', 'path', 'title', 'content', 'type', 'updatedAt', 'tags'],
    filter,
    top: size,
    highlightFields: 'content,title',
    highlightPreTag: '<mark>',
    highlightPostTag: '</mark>',
    queryType: 'simple',
    searchMode: 'any',
  });

  const hits: SearchHit[] = [];
  for await (const result of response.results) {
    const doc = toDocDocument(result.document);
    const highlights: string[] = [
      ...(result.highlights?.['content'] ?? []),
      ...(result.highlights?.['title'] ?? []),
    ];
    hits.push({ ...doc, score: result.score ?? null, highlights });
  }

  return hits;
}
