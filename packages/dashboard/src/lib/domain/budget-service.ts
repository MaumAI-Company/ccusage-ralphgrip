// Budget service — budget CRUD through port.
// All dependencies injected — no direct imports of adapters or I/O.

import type { BudgetRepository, MemberReadRepository } from './ports';

export class BudgetService {
  constructor(
    private budgets: BudgetRepository,
    private members: MemberReadRepository,
  ) {}

  async getAll() {
    const [budgets, members] = await Promise.all([
      this.budgets.getAllBudgets(),
      this.members.getAllMembers(),
    ]);
    return { budgets, members };
  }

  async upsert(memberId: string | null, budgetType: string, budgetUsd: number) {
    await this.budgets.upsertBudget(memberId, budgetType, budgetUsd);
  }
}
