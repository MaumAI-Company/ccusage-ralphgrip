// Access token (JWT via jose) — pure functions, no DB access.
// Refresh token DB operations moved to RefreshTokenService in domain.
// Route handlers should import RefreshTokenService from container.

import { SignJWT, jwtVerify } from 'jose';
import { loadAppConfig } from '@/lib/adapters/env-config';

const ACCESS_TOKEN_EXPIRY = '1h';

export interface AccessTokenPayload {
  sub: string; // email
  email: string;
  name: string;
}

function getSigningKey(): Uint8Array {
  const { sessionSecret } = loadAppConfig();
  return new TextEncoder().encode(sessionSecret);
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getSigningKey());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey());
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export function generateRefreshToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
