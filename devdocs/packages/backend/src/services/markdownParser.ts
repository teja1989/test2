import matter from 'gray-matter';
import { marked } from 'marked';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { DocDocument } from './azureAISearch.js';

export async function parseMarkdownFile(
  filePath: string,
  repo: string,
  basePath: string,
): Promise<DocDocument> {
  const raw = await fs.readFile(filePath, 'utf-8');
  const { data, content } = matter(raw);
  const relativePath = path.relative(basePath, filePath);
  const title =
    typeof data['title'] === 'string' && data['title']
      ? data['title']
      : path.basename(filePath, path.extname(filePath));

  return {
    id: crypto.createHash('sha256').update(`${repo}:${relativePath}`).digest('hex'),
    repo,
    path: relativePath,
    title,
    content,
    type: 'markdown',
    updatedAt: new Date().toISOString(),
    tags: Array.isArray(data['tags']) ? (data['tags'] as string[]) : [],
  };
}

export function renderMarkdown(content: string): string {
  return marked.parse(content) as string;
}
