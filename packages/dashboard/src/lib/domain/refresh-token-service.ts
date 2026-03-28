// Refresh token service — opaque token storage and validation.
// All dependencies injected — no direct imports of adapters or I/O.

import type { RefreshTokenRepository } from './ports';

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export class RefreshTokenService {
  constructor(private tokens: RefreshTokenRepository) {}

  async store(token: string, userEmail: string, userName: string): Promise<void> {
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await this.tokens.store(tokenHash, userEmail, userName, expiresAt.toISOString());
  }

  async validate(token: string): Promise<{ email: string; name: string } | null> {
    const tokenHash = await hashToken(token);
    const row = await this.tokens.findByHash(tokenHash);
    if (!row) return null;
    if (new Date(row.expiresAt) < new Date()) {
      await this.tokens.deleteByHash(tokenHash);
      return null;
    }
    return { email: row.userEmail, name: row.userName };
  }

  async revoke(token: string): Promise<void> {
    const tokenHash = await hashToken(token);
    await this.tokens.deleteByHash(tokenHash);
  }
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
