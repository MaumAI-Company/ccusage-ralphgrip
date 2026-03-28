import { describe, it, expect, beforeEach } from 'vitest';
import { PlanService } from './plan-service';
import { MockPlanRepo } from '@/lib/test-utils/mock-repos';

describe('PlanService', () => {
  let repo: MockPlanRepo;
  let service: PlanService;

  beforeEach(() => {
    repo = new MockPlanRepo();
    service = new PlanService(repo);
  });

  it('returns all plans', async () => {
    repo.plans = [{ id: 'p1', memberId: 'm1', displayName: 'alice', planName: 'max5', billingStart: '2026-03-01', isPersonal: false, note: null }];
    const result = await service.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].planName).toBe('max5');
  });

  it('delegates upsert to repo', async () => {
    await service.upsert('m1', 'max20', '2026-04-01', true, 'personal');
    expect(repo.upsertCalls[0]).toEqual({ memberId: 'm1', planName: 'max20', billingStart: '2026-04-01', isPersonal: true, note: 'personal' });
  });
});
