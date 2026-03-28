import { describe, it, expect, beforeEach } from 'vitest';
import { BudgetService } from './budget-service';
import { MockBudgetRepo, MockMemberReadRepo } from '@/lib/test-utils/mock-repos';

describe('BudgetService', () => {
  let budgetRepo: MockBudgetRepo;
  let memberRepo: MockMemberReadRepo;
  let service: BudgetService;

  beforeEach(() => {
    budgetRepo = new MockBudgetRepo();
    memberRepo = new MockMemberReadRepo();
    service = new BudgetService(budgetRepo, memberRepo);
  });

  it('returns budgets and members together', async () => {
    budgetRepo.budgets = [{ id: 'b1', memberId: null, budgetType: 'weekly', budgetUsd: 50 }];
    memberRepo.members = [{ id: 'm1', name: 'alice', displayName: 'alice' }];
    const result = await service.getAll();
    expect(result.budgets).toHaveLength(1);
    expect(result.members).toHaveLength(1);
  });

  it('delegates upsert to repo', async () => {
    await service.upsert('m1', 'weekly', 100);
    expect(budgetRepo.upsertCalls[0]).toEqual({ memberId: 'm1', budgetType: 'weekly', budgetUsd: 100 });
  });

  it('handles null memberId for team-wide budget', async () => {
    await service.upsert(null, 'monthly', 500);
    expect(budgetRepo.upsertCalls[0].memberId).toBeNull();
  });
});
