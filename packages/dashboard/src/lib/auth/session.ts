// Encrypted cookie session management using AES-256-GCM via Web Crypto API.
// Config is loaded from the AppConfig port via env-config adapter.

import { cookies } from 'next/headers';
import { loadAppConfig } from '@/lib/adapters/env-config';

const SESSION_COOKIE = 'ccusage_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionData {
  email: string;
  name: string;
  avatarUrl: string | null;
  provider: string;
  expiresAt: number; // epoch ms
}

function deriveKey(secret: string): ArrayBuffer {
  const raw = atob(secret);
  if (raw.length < 32) throw new Error('SESSION_SECRET must be at least 32 bytes (base64-encoded)');
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

async function getKey(): Promise<CryptoKey> {
  const { sessionSecret } = loadAppConfig();
  return crypto.subtle.importKey(
    'raw',
    deriveKey(sessionSecret),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encrypt(data: SessionData): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(token: string): Promise<SessionData | null> {
  try {
    const key = await getKey();
    const combined = Uint8Array.from(atob(token), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );
    const data = JSON.parse(new TextDecoder().decode(decrypted)) as SessionData;
    if (data.expiresAt < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function setSessionCookie(data: SessionData): Promise<void> {
  const token = await encrypt(data);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie?.value) return null;
  return decrypt(cookie.value);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
