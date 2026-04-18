import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';

// ── Card theme colours ────────────────────────────────────────────────────────
const THEME = {
  info: '0078D4',    // Teams blue
  success: '107C10', // green
  error: 'D83B01',   // red
  warning: 'FFB900', // amber
} as const;

// ── Minimal MessageCard types ─────────────────────────────────────────────────
interface Fact {
  name: string;
  value: string;
}

interface Section {
  activityTitle: string;
  activitySubtitle?: string;
  facts?: Fact[];
  markdown: true;
}

interface OpenUriAction {
  '@type': 'OpenUri';
  name: string;
  targets: [{ os: 'default'; uri: string }];
}

interface MessageCard {
  '@type': 'MessageCard';
  '@context': 'http://schema.org/extensions';
  themeColor: string;
  summary: string;
  sections: Section[];
  potentialAction?: OpenUriAction[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function viewAction(path = ''): OpenUriAction | undefined {
  if (!config.APP_URL) return undefined;
  return {
    '@type': 'OpenUri',
    name: '🔍 Open DevDocs',
    targets: [{ os: 'default', uri: `${config.APP_URL}${path}` }],
  };
}

function ts(): string {
  return new Date().toLocaleString('en-GB', { timeZoneName: 'short' });
}

async function postCard(card: MessageCard): Promise<void> {
  if (!config.TEAMS_WEBHOOK_URL) return;
  try {
    const res = await fetch(config.TEAMS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
    if (!res.ok) {
      logger.warn(`Teams webhook responded ${res.status}: ${await res.text().catch(() => '')}`);
    }
  } catch (err) {
    logger.error('Teams notification failed:', err);
  }
}

// ── Batch file-change accumulator ─────────────────────────────────────────────
// Debounces rapid chokidar events into a single card per repo per burst.
const pendingFiles = new Map<string, Set<string>>();
const batchTimers = new Map<string, ReturnType<typeof setTimeout>>();
const BATCH_DELAY_MS = 5_000;

export function queueFileNotification(repo: string, relativePath: string): void {
  if (!config.TEAMS_WEBHOOK_URL) return;

  if (!pendingFiles.has(repo)) pendingFiles.set(repo, new Set());
  pendingFiles.get(repo)!.add(relativePath);

  const existing = batchTimers.get(repo);
  if (existing) clearTimeout(existing);

  batchTimers.set(
    repo,
    setTimeout(() => {
      const files = [...(pendingFiles.get(repo) ?? [])];
      pendingFiles.delete(repo);
      batchTimers.delete(repo);
      void sendFilesChanged(repo, files);
    }, BATCH_DELAY_MS),
  );
}

async function sendFilesChanged(repo: string, files: string[]): Promise<void> {
  const listed = files
    .slice(0, 15)
    .map((f) => `• \`${f}\``)
    .join('\n');
  const overflow = files.length > 15 ? `\n_…and ${files.length - 15} more_` : '';
  const action = viewAction(`/docs/${repo}/`);

  await postCard({
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: THEME.info,
    summary: `DevDocs: ${files.length} file(s) updated in ${repo}`,
    sections: [
      {
        activityTitle: `📄 ${files.length} file(s) indexed — \`${repo}\``,
        activitySubtitle: ts(),
        facts: [
          { name: 'Repository', value: repo },
          { name: 'Changed files', value: `${listed}${overflow}` },
        ],
        markdown: true,
      },
    ],
    ...(action ? { potentialAction: [action] } : {}),
  });
}

// ── Sync lifecycle ─────────────────────────────────────────────────────────────
export async function notifySyncStart(repo: string): Promise<void> {
  await postCard({
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: THEME.warning,
    summary: `DevDocs: syncing ${repo}`,
    sections: [
      {
        activityTitle: `🔄 Sync started — \`${repo}\``,
        activitySubtitle: ts(),
        facts: [{ name: 'Started at', value: new Date().toISOString() }],
        markdown: true,
      },
    ],
  });
}

export async function notifySyncComplete(repo: string, durationMs: number): Promise<void> {
  const action = viewAction(`/docs/${repo}/`);
  await postCard({
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: THEME.success,
    summary: `DevDocs: ${repo} synced successfully`,
    sections: [
      {
        activityTitle: `✅ Sync complete — \`${repo}\``,
        activitySubtitle: ts(),
        facts: [
          { name: 'Repository', value: repo },
          { name: 'Duration', value: `${(durationMs / 1000).toFixed(1)} s` },
        ],
        markdown: true,
      },
    ],
    ...(action ? { potentialAction: [action] } : {}),
  });
}

export async function notifySyncFailed(repo: string, error: string): Promise<void> {
  await postCard({
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: THEME.error,
    summary: `DevDocs: sync FAILED for ${repo}`,
    sections: [
      {
        activityTitle: `❌ Sync failed — \`${repo}\``,
        activitySubtitle: ts(),
        facts: [
          { name: 'Repository', value: repo },
          { name: 'Error', value: error },
        ],
        markdown: true,
      },
    ],
  });
}

// ── GitHub webhook push ────────────────────────────────────────────────────────
export async function notifyWebhookPush(
  repo: string,
  branch: string,
  pusher?: string,
  commitMessage?: string,
): Promise<void> {
  const action = viewAction(`/docs/${repo}/`);
  await postCard({
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: THEME.info,
    summary: `DevDocs: push received for ${repo}@${branch}`,
    sections: [
      {
        activityTitle: `🚀 Push received — \`${repo}\` @ \`${branch}\``,
        activitySubtitle: ts(),
        facts: [
          ...(pusher ? [{ name: 'Pushed by', value: pusher }] : []),
          ...(commitMessage
            ? [{ name: 'Commit', value: commitMessage.split('\n')[0] ?? commitMessage }]
            : []),
        ],
        markdown: true,
      },
    ],
    ...(action ? { potentialAction: [action] } : {}),
  });
}
