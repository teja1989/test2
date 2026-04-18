import type { Request, Response, NextFunction } from 'express';
import { isSsoEnabled } from '../services/auth.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // SSO not configured → open access (useful for local dev / private networks)
  if (!isSsoEnabled()) {
    next();
    return;
  }
  if (!req.session.user) {
    res.status(401).json({ error: 'Unauthorized', loginUrl: '/api/auth/login' });
    return;
  }
  next();
}
