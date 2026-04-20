import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { config, type RepoConfig } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import {
  notifySyncStart,
  notifySyncComplete,
  notifySyncFailed,
} from './teamsNotifier.js';

export type { RepoConfig };

export function getRepoConfigs(): RepoConfig[] {
  return config.GITHUB_REPOS;
}

/**
 * Injects the PAT into an HTTPS URL as the password so git can authenticate
 * without writing credentials to disk.  SSH git@ URLs are returned unchanged
 * because PATs don't apply to SSH transport.
 */
function buildAuthUrl(url: string, pat: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') {
      parsed.username = 'oauth2';
      parsed.password = pat;
      return parsed.toString();
    }
  } catch {
    // git@github.com:org/repo.git — not a standard URL; SSH key auth handles it
  }
  return url;
}

export async function syncRepo(repo: RepoConfig): Promise<void> {
  const repoPath = path.resolve(config.DOCS_BASE_PATH, repo.name);
  await fs.mkdir(repoPath, { recursive: true });

  const branch = repo.branch;

  // Build authenticated URL on every call — never persisted in .git/config
  const remoteUrl = config.GITHUB_PAT ? buildAuthUrl(repo.url, config.GITHUB_PAT) : repo.url;

  const git = simpleGit(repoPath);
  const isRepo = await git.checkIsRepo().catch(() => false);
  const t0 = Date.now();

  void notifySyncStart(repo.name);

  try {
    if (!isRepo) {
      logger.info(`Cloning ${repo.name}@${branch}`);
      await simpleGit().clone(remoteUrl, repoPath, ['--depth', '1', '--branch', branch]);
    } else {
      logger.info(`Fetching ${repo.name}@${branch}`);
      // Pass the authenticated URL directly so it is never stored in git config
      await git.fetch(remoteUrl, branch);
      await git.merge(['FETCH_HEAD', '--ff-only']);
    }

    void notifySyncComplete(repo.name, Date.now() - t0);
    logger.info(`Sync complete for ${repo.name} (${Date.now() - t0}ms)`);
  } catch (err) {
    void notifySyncFailed(repo.name, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

export async function syncAllRepos(): Promise<void> {
  const repos = getRepoConfigs();
  if (repos.length === 0) {
    logger.warn('No repos configured — set GITHUB_REPOS in .env');
    return;
  }
  const results = await Promise.allSettled(repos.map(syncRepo));
  results.forEach((r, i) => {
    if (r.status === 'rejected') logger.error(`Sync failed for ${repos[i]?.name}:`, r.reason);
  });
}
