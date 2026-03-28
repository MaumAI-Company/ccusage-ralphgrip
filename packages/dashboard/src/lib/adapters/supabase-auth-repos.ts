// Supabase adapters for auth repository ports.

import { supabase } from '@/lib/db';
import type {
  DeviceChallengeRepository,
  DeviceChallengeRow,
  RefreshTokenRepository,
  AllowlistRepository,
} from '@/lib/domain/ports';

export class SupabaseDeviceChallengeRepo implements DeviceChallengeRepository {
  async create(challengeHash: string, expiresAt: string): Promise<void> {
    const { error } = await supabase.from('device_challenges').insert({
      challenge_hash: challengeHash,
      status: 'pending',
      expires_at: expiresAt,
    });
    if (error) throw new Error(`Failed to create device challenge: ${error.message}`);
  }

  async getByHash(challengeHash: string): Promise<DeviceChallengeRow | null> {
    const { data, error } = await supabase
      .from('device_challenges')
      .select('status, user_email, user_name, expires_at')
      .eq('challenge_hash', challengeHash)
      .single();

    if (error || !data) return null;

    return {
      status: data.status as string,
      userEmail: data.user_email ?? null,
      userName: data.user_name ?? null,
      expiresAt: data.expires_at as string,
    };
  }

  async authorize(challengeHash: string, userEmail: string, userName: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('device_challenges')
      .update({
        status: 'authorized',
        user_email: userEmail,
        user_name: userName,
      })
      .eq('challenge_hash', challengeHash)
      .eq('status', 'pending')
      .select('id')
      .single();

    return !error && !!data;
  }

  async deleteByHash(challengeHash: string): Promise<void> {
    await supabase.from('device_challenges').delete().eq('challenge_hash', challengeHash);
  }
}

export class SupabaseRefreshTokenRepo implements RefreshTokenRepository {
  async store(tokenHash: string, userEmail: string, userName: string, expiresAt: string): Promise<void> {
    const { error } = await supabase.from('refresh_tokens').insert({
      token_hash: tokenHash,
      user_email: userEmail,
      user_name: userName,
      expires_at: expiresAt,
    });
    if (error) throw new Error(`Failed to store refresh token: ${error.message}`);
  }

  async findByHash(tokenHash: string): Promise<{ userEmail: string; userName: string; expiresAt: string } | null> {
    const { data, error } = await supabase
      .from('refresh_tokens')
      .select('user_email, user_name, expires_at')
      .eq('token_hash', tokenHash)
      .single();

    if (error || !data) return null;

    return {
      userEmail: data.user_email as string,
      userName: data.user_name as string,
      expiresAt: data.expires_at as string,
    };
  }

  async deleteByHash(tokenHash: string): Promise<void> {
    await supabase.from('refresh_tokens').delete().eq('token_hash', tokenHash);
  }
}

export class SupabaseAllowlistRepo implements AllowlistRepository {
  async isEmailInList(email: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('allowed_emails')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    return !error && !!data;
  }
}
