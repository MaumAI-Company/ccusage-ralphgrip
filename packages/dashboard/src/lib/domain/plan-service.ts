// Plan service — member plan CRUD through port.
// All dependencies injected — no direct imports of adapters or I/O.

import type { PlanRepository } from './ports';

export class PlanService {
  constructor(private plans: PlanRepository) {}

  async getAll() {
    return this.plans.getAllMemberPlans();
  }

  async upsert(memberId: string, planName: string, billingStart: string, isPersonal: boolean, note: string | null) {
    await this.plans.upsertMemberPlan(memberId, planName, billingStart, isPersonal, note);
  }
}
