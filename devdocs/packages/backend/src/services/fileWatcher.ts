import chokidar from 'chokidar';
import path from 'path';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { indexDocument } from './elasticsearch.js';
import { parseMarkdownFile } from './markdownParser.js';
import { parsePdfFile } from './pdfParser.js';
import { getRepoConfigs } from './gitSync.js';

const SUPPORTED = new Set(['.md', '.mdx', '.pdf']);

async function processFile(filePath: string, repo: string, basePath: string): Promise<void> {
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED.has(ext)) return;

  try {
    const doc =
      ext === '.pdf'
        ? await parsePdfFile(filePath, repo, basePath)
        : await parseMarkdownFile(filePath, repo, basePath);

    await indexDocument(doc);
    logger.debug(`Indexed: ${filePath}`);
  } catch (err) {
    logger.error(`Failed to process ${filePath}:`, err);
  }
}

export function startFileWatcher(): void {
  const repos = getRepoConfigs();

  for (const repo of repos) {
    const repoPath = path.resolve(config.DOCS_BASE_PATH, repo.name);

    const watcher = chokidar.watch(repoPath, {
      ignored: /(^|[/\\])\../, // hidden files
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    });

    watcher
      .on('add', (fp) => void processFile(fp, repo.name, repoPath))
      .on('change', (fp) => void processFile(fp, repo.name, repoPath))
      .on('error', (err) => logger.error('Watcher error:', err));

    logger.info(`Watching ${repoPath}`);
  }
}
