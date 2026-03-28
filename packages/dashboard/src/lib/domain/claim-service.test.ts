import { describe, it, expect, beforeEach } from 'vitest';
import { ClaimService } from './claim-service';
import { MockClaimRepo } from '@/lib/test-utils/mock-repos';

describe('ClaimService', () => {
  let repo: MockClaimRepo;
  let service: ClaimService;

  beforeEach(() => {
    repo = new MockClaimRepo();
    service = new ClaimService(repo);
  });

  it('returns unclaimed members', async () => {
    repo.unclaimed = [{ name: 'alice', recordCount: 10, firstSeen: '2026-03-01T00:00:00Z' }];
    const result = await service.getUnclaimed();
    expect(result).toHaveLength(1);
  });

  it('claims an unclaimed member', async () => {
    repo.members.set('alice', { id: 'id-1', email: null });
    const result = await service.claim('alice', 'alice@test.com');
    expect(result).toEqual({ ok: true, memberName: 'alice', email: 'alice@test.com' });
    expect(repo.claimCalls[0]).toEqual({ memberId: 'id-1', email: 'alice@test.com' });
  });

  it('allows re-claim by same email', async () => {
    repo.members.set('alice', { id: 'id-1', email: 'alice@test.com' });
    const result = await service.claim('alice', 'alice@test.com');
    expect(result).toEqual({ ok: true, memberName: 'alice', email: 'alice@test.com' });
  });

  it('returns 404 when member not found', async () => {
    const result = await service.claim('ghost', 'x@test.com');
    expect(result).toEqual({ ok: false, error: 'Member not found', status: 404 });
  });

  it('returns 409 when claimed by another user', async () => {
    repo.members.set('alice', { id: 'id-1', email: 'other@test.com' });
    const result = await service.claim('alice', 'alice@test.com');
    expect(result).toEqual({ ok: false, error: 'Member already claimed by another user', status: 409 });
    expect(repo.claimCalls).toHaveLength(0);
  });
});
