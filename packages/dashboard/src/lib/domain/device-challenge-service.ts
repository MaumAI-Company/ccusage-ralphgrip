// Device challenge service — CLI device auth flow.
// All dependencies injected — no direct imports of adapters or I/O.

import type { DeviceChallengeRepository } from './ports';

const CHALLENGE_TTL_SECONDS = 300; // 5 minutes
const CHALLENGE_LENGTH = 8;

function generateChallengeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability
  const bytes = crypto.getRandomValues(new Uint8Array(CHALLENGE_LENGTH));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

async function hashChallenge(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

export interface DeviceChallenge {
  challenge: string;
  url: string;
  expiresIn: number;
}

export type ChallengeStatus = 'pending' | 'authorized' | 'expired' | 'not_found';

export interface ChallengeInfo {
  status: ChallengeStatus;
  userEmail?: string;
  userName?: string;
}

export class DeviceChallengeService {
  constructor(private challenges: DeviceChallengeRepository) {}

  async create(baseUrl: string): Promise<DeviceChallenge> {
    const challenge = generateChallengeCode();
    const challengeHash = await hashChallenge(challenge);
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000);

    await this.challenges.create(challengeHash, expiresAt.toISOString());

    return {
      challenge,
      url: `${baseUrl}/auth/device?code=${challenge}`,
      expiresIn: CHALLENGE_TTL_SECONDS,
    };
  }

  async getStatus(code: string): Promise<ChallengeInfo> {
    const challengeHash = await hashChallenge(code);
    const row = await this.challenges.getByHash(challengeHash);

    if (!row) return { status: 'not_found' };
    if (new Date(row.expiresAt) < new Date()) {
      await this.challenges.deleteByHash(challengeHash);
      return { status: 'expired' };
    }

    return {
      status: row.status as ChallengeStatus,
      userEmail: row.userEmail ?? undefined,
      userName: row.userName ?? undefined,
    };
  }

  async authorize(code: string, userEmail: string, userName: string): Promise<boolean> {
    const challengeHash = await hashChallenge(code);
    return this.challenges.authorize(challengeHash, userEmail, userName);
  }

  async consume(code: string): Promise<void> {
    const challengeHash = await hashChallenge(code);
    await this.challenges.deleteByHash(challengeHash);
  }
}
