import { Client } from '@elastic/elasticsearch';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';

export const esClient = new Client({ node: config.ES_NODE });

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

export async function ensureIndex(): Promise<void> {
  const exists = await esClient.indices.exists({ index: config.ES_INDEX });
  if (exists) return;

  await esClient.indices.create({
    index: config.ES_INDEX,
    mappings: {
      properties: {
        id: { type: 'keyword' },
        repo: { type: 'keyword' },
        path: { type: 'keyword' },
        title: { type: 'text', analyzer: 'english', fields: { keyword: { type: 'keyword' } } },
        content: { type: 'text', analyzer: 'english' },
        type: { type: 'keyword' },
        updatedAt: { type: 'date' },
        tags: { type: 'keyword' },
      },
    },
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
    },
  });
  logger.info(`Created ES index: ${config.ES_INDEX}`);
}

export async function indexDocument(doc: DocDocument): Promise<void> {
  await esClient.index({
    index: config.ES_INDEX,
    id: doc.id,
    document: doc,
    refresh: 'wait_for',
  });
}

export interface SearchHit extends DocDocument {
  score: number | null;
  highlights: string[];
}

export async function searchDocuments(
  query: string,
  repo?: string,
  size = 20,
): Promise<SearchHit[]> {
  const must: object[] = [
    {
      multi_match: {
        query,
        fields: ['title^3', 'content'],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    },
  ];

  if (repo) must.push({ term: { repo } });

  const result = await esClient.search<DocDocument>({
    index: config.ES_INDEX,
    query: { bool: { must } },
    highlight: {
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
      fields: {
        content: { fragment_size: 200, number_of_fragments: 3 },
        title: { number_of_fragments: 0 },
      },
    },
    size,
    _source: true,
  });

  return result.hits.hits.map((hit) => ({
    ...(hit._source as DocDocument),
    score: hit._score ?? null,
    highlights: hit.highlight?.['content'] ?? [],
  }));
}
