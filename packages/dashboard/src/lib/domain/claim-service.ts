// Claim service — member claim workflow with validation.
// All dependencies injected — no direct imports of adapters or I/O.

import type { ClaimRepository, UnclaimedMemberRow } from './ports';

export type ClaimResult =
  | { ok: true; memberName: string; email: string }
  | { ok: false; error: string; status: number };

export class ClaimService {
  constructor(private claims: ClaimRepository) {}

  async getUnclaimed(): Promise<UnclaimedMemberRow[]> {
    return this.claims.getUnclaimedMembersWithCounts();
  }

  async claim(memberName: string, email: string): Promise<ClaimResult> {
    const member = await this.claims.findMemberByName(memberName);

    if (!member) {
      return { ok: false, error: 'Member not found', status: 404 };
    }

    if (member.email && member.email !== email) {
      return { ok: false, error: 'Member already claimed by another user', status: 409 };
    }

    await this.claims.claimMember(member.id, email);
    return { ok: true, memberName, email };
  }
}
