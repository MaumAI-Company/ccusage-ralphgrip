import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileService } from './profile-service';
import type { ProfileRepository, MemberProfileRow } from './ports';

class MockProfileRepo implements ProfileRepository {
  members: Map<string, MemberProfileRow> = new Map();
  updateCalls: Array<{ memberId: string; displayName: string }> = [];

  async getMemberByEmail(email: string): Promise<MemberProfileRow | null> {
    for (const m of this.members.values()) {
      if (m.email === email) return m;
    }
    return null;
  }

  async updateDisplayName(memberId: string, displayName: string): Promise<void> {
    this.updateCalls.push({ memberId, displayName });
    const member = this.members.get(memberId);
    if (member) member.displayName = displayName;
  }
}

describe('ProfileService', () => {
  let repo: MockProfileRepo;
  let service: ProfileService;

  beforeEach(() => {
    repo = new MockProfileRepo();
    service = new ProfileService(repo);
  });

  describe('getProfile', () => {
    it('returns claimed profile when member exists', async () => {
      repo.members.set('m1', { id: 'm1', name: 'alice', displayName: 'Alice K', email: 'alice@co.com' });

      const result = await service.getProfile('alice@co.com');
      expect(result.ok).toBe(true);
      if (result.ok && result.claimed) {
        expect(result.profile.name).toBe('alice');
        expect(result.profile.displayName).toBe('Alice K');
      }
    });

    it('returns not-linked when no member matches email', async () => {
      const result = await service.getProfile('nobody@co.com');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.claimed).toBe(false);
      }
    });
  });

  describe('updateDisplayName', () => {
    it('updates display name for existing member', async () => {
      repo.members.set('m1', { id: 'm1', name: 'bob', displayName: null, email: 'bob@co.com' });

      const result = await service.updateDisplayName('bob@co.com', 'Bob S');
      expect(result.ok).toBe(true);
      expect(repo.updateCalls).toHaveLength(1);
      expect(repo.updateCalls[0]).toEqual({ memberId: 'm1', displayName: 'Bob S' });
    });

    it('returns 404 when email not found', async () => {
      const result = await service.updateDisplayName('nobody@co.com', 'Name');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(404);
    });
  });
});
