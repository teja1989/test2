import { Router } from 'express';
import crypto from 'crypto';
import { config } from '../lib/config.js';
import { getRepoConfigs, syncRepo } from '../services/gitSync.js';
import { notifyWebhookPush } from '../services/teamsNotifier.js';
import { logger } from '../lib/logger.js';

export const webhooksRouter = Router();

function verifySignature(payload: Buffer, signature: string): boolean {
  const digest = `sha256=${crypto
    .createHmac('sha256', config.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')}`;
  try {
    return (
      digest.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(signature, 'utf8'))
    );
  } catch {
    return false;
  }
}

webhooksRouter.post('/github', async (req, res, next) => {
  try {
    const sig = req.headers['x-hub-signature-256'];
    if (typeof sig !== 'string' || !verifySignature(req.body as Buffer, sig)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const payload = JSON.parse((req.body as Buffer).toString('utf-8')) as {
      ref?: string;
      repository?: { name?: string };
      pusher?: { name?: string };
      head_commit?: { message?: string };
    };

    const repoName = payload.repository?.name;
    const branch = payload.ref?.replace('refs/heads/', '');

    if (branch && repoName) {
      const repo = getRepoConfigs().find((r) => r.name === repoName);
      if (repo && branch === repo.branch) {
        // Fire Teams notification immediately, sync runs async
        void notifyWebhookPush(
          repoName,
          branch,
          payload.pusher?.name,
          payload.head_commit?.message,
        );

        syncRepo(repo).catch((err: unknown) =>
          logger.error(`Webhook sync failed for ${repoName}:`, err),
        );
      }
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
