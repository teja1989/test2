import { Router } from 'express';
import { generators } from 'openid-client';
import { getAuthClient, isSsoEnabled } from '../services/auth.js';
import { config } from '../lib/config.js';

export const authRouter = Router();

// Frontend polls this to know whether to show a login button
authRouter.get('/config', (_req, res) => {
  res.json({ ssoEnabled: isSsoEnabled() });
});

// Returns the current user; 401 when SSO is on but no session exists
authRouter.get('/me', (req, res) => {
  if (!isSsoEnabled()) {
    res.json({ sub: 'guest', name: 'Guest', email: '', ssoEnabled: false });
    return;
  }
  if (!req.session.user) {
    res.status(401).json({ error: 'Unauthorized', loginUrl: '/api/auth/login' });
    return;
  }
  res.json({ ...req.session.user, ssoEnabled: true });
});

// Kick off the Azure AD PKCE auth code flow
authRouter.get('/login', async (req, res, next) => {
  try {
    const client = getAuthClient();
    if (!client) { res.redirect(config.APP_URL ?? '/'); return; }

    const state = generators.state();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    req.session.oidcState = state;
    req.session.pkceVerifier = codeVerifier;

    const authUrl = client.authorizationUrl({
      scope: 'openid profile email offline_access',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    res.redirect(authUrl);
  } catch (err) { next(err); }
});

// Azure AD redirects here after the user authenticates
authRouter.get('/callback', async (req, res, next) => {
  try {
    const client = getAuthClient();
    if (!client) { res.redirect(config.APP_URL ?? '/'); return; }

    const params = client.callbackParams(req);
    const tokenSet = await client.callback(
      config.AZURE_AD_REDIRECT_URI!,
      params,
      { state: req.session.oidcState, code_verifier: req.session.pkceVerifier },
    );

    const claims = tokenSet.claims();
    req.session.user = {
      sub: claims.sub,
      name: (claims['name'] as string) ?? '',
      email: (claims['email'] as string) ?? '',
    };

    delete req.session.oidcState;
    delete req.session.pkceVerifier;

    res.redirect(config.APP_URL ?? '/');
  } catch (err) { next(err); }
});

// Clear session then redirect to Azure AD global logout
authRouter.get('/logout', (req, res) => {
  req.session.destroy(() => {
    if (isSsoEnabled() && config.AZURE_AD_TENANT_ID) {
      const post = encodeURIComponent(config.APP_URL ?? '/');
      res.redirect(
        `https://login.microsoftonline.com/${config.AZURE_AD_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${post}`,
      );
    } else {
      res.redirect(config.APP_URL ?? '/');
    }
  });
});
