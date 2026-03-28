// Report service — delegates to concurrent RPC-backed repository methods.
// All dependencies injected — no direct imports of adapters or I/O.

import type { Clock, ReportRepository } from './ports';
import { formatProjectName } from './project-name';

export class ReportService {
  constructor(
    private repo: ReportRepository,
    private clock: Clock,
  ) {}

  async generateReport(days: number) {
    const since = new Date(this.clock.now().getTime() - days * 86400000).toISOString();

    const [members, daily, weekly, models, rawProjects, summary, plans] = await Promise.all([
      this.repo.getReportMembers(since),
      this.repo.getReportDaily(since),
      this.repo.getReportWeekly(since),
      this.repo.getReportModels(since),
      this.repo.getReportProjects(since),
      this.repo.getReportSummary(since),
      this.repo.getMemberPlansForReport(),
    ]);

    // Sanitize project paths server-side so raw filesystem paths never reach the client
    const projects = rawProjects.map(p => ({
      ...p,
      project: formatProjectName(p.project),
    }));

    return { summary, members, daily, weekly, models, projects, plans };
  }
}
