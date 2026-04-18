import { Issuer, generators, type Client } from 'openid-client';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';

let oidcClient: Client | null = null;

export async function initAuthClient(): Promise<void> {
  if (!config.AZURE_AD_TENANT_ID || !config.AZURE_AD_CLIENT_ID) {
    logger.info('Azure SSO not configured — portal is open access');
    return;
  }
  try {
    const issuer = await Issuer.discover(
      `https://login.microsoftonline.com/${config.AZURE_AD_TENANT_ID}/v2.0`,
    );
    oidcClient = new issuer.Client({
      client_id: config.AZURE_AD_CLIENT_ID,
      client_secret: config.AZURE_AD_CLIENT_SECRET,
      redirect_uris: [config.AZURE_AD_REDIRECT_URI!],
      response_types: ['code'],
    });
    logger.info('Azure SSO (Entra ID) client initialised');
  } catch (err) {
    logger.error('OIDC client init failed — SSO disabled:', err);
  }
}

export function getAuthClient(): Client | null {
  return oidcClient;
}

export function isSsoEnabled(): boolean {
  return oidcClient !== null;
}

export { generators };
