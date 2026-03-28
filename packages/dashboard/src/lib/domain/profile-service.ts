// Profile management domain service.
// All dependencies injected — no direct imports of adapters or I/O.

import type { ProfileRepository, MemberProfileRow } from './ports';

export type ProfileResult =
  | { ok: true; claimed: true; profile: MemberProfileRow }
  | { ok: true; claimed: false }
  | { ok: false; error: string; status: number };

export type UpdateResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export class ProfileService {
  constructor(private profiles: ProfileRepository) {}

  async getProfile(email: string): Promise<ProfileResult> {
    const profile = await this.profiles.getMemberByEmail(email);
    if (profile) {
      return { ok: true, claimed: true, profile };
    }
    return { ok: true, claimed: false };
  }

  async updateDisplayName(email: string, displayName: string): Promise<UpdateResult> {
    const profile = await this.profiles.getMemberByEmail(email);
    if (!profile) {
      return { ok: false, error: 'No member found for this email', status: 404 };
    }
    await this.profiles.updateDisplayName(profile.id, displayName);
    return { ok: true };
  }
}
