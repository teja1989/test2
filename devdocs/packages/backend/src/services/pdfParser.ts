import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { DocDocument } from './azureAISearch.js';

export async function parsePdfFile(
  filePath: string,
  repo: string,
  basePath: string,
): Promise<DocDocument> {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  const relativePath = path.relative(basePath, filePath);
  const title = path.basename(filePath, '.pdf');

  return {
    id: crypto.createHash('sha256').update(`${repo}:${relativePath}`).digest('hex'),
    repo,
    path: relativePath,
    title,
    content: data.text,
    type: 'pdf',
    updatedAt: new Date().toISOString(),
    tags: [],
  };
}
