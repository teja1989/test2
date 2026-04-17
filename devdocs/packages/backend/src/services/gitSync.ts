import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';

export interface RepoConfig {
  url: string;
  name: string;
}

export function getRepoConfigs(): RepoConfig[] {
  const repos: RepoConfig[] = [];
  let i = 1;
  while (process.env[`REPO_${i}_URL`]) {
    repos.push({
      url: process.env[`REPO_${i}_URL`]!,
      name: process.env[`REPO_${i}_NAME`] ?? `repo-${i}`,
    });
    i++;
  }
  return repos;
}

export async function syncRepo(repo: RepoConfig): Promise<void> {
  const repoPath = path.resolve(config.DOCS_BASE_PATH, repo.name);
  await fs.mkdir(repoPath, { recursive: true });

  const git = simpleGit(repoPath);
  const isRepo = await git.checkIsRepo().catch(() => false);

  if (!isRepo) {
    logger.info(`Cloning ${repo.name} from ${repo.url}`);
    await simpleGit().clone(repo.url, repoPath, ['--depth', '1']);
  } else {
    logger.info(`Pulling latest for ${repo.name}`);
    await git.pull('origin', 'main', ['--ff-only']);
  }

  logger.info(`Sync complete for ${repo.name}`);
}

export async function syncAllRepos(): Promise<void> {
  const repos = getRepoConfigs();
  if (repos.length === 0) {
    logger.warn('No repos configured. Set REPO_1_URL / REPO_1_NAME in .env');
    return;
  }
  const results = await Promise.allSettled(repos.map(syncRepo));
  results.forEach((r, i) => {
    if (r.status === 'rejected') logger.error(`Sync failed for ${repos[i]?.name}:`, r.reason);
  });
}
