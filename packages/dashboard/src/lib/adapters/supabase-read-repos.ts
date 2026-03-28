// Supabase adapters implementing read-side repository ports.
// Each class wraps Supabase RPC/query calls — no domain logic.

import { supabase } from '@/lib/db';
import { systemClock } from '@/lib/domain/ports';
import { getWeekStart, getWeekStartByOffset, getMonthStart } from '@/lib/domain/time';
import type {
  UsageReadRepository,
  MemberReadRepository,
  BudgetRepository,
  UtilizationReadRepository,
  PlanRepository,
  ToolUsageReadRepository,
  ReportRepository,
  ClaimRepository,
  DailyUsageRow,
  MemberUsageRow,
  ModelDistributionRow,
  MemberSessionCountRow,
  BudgetUsageRow,
  VelocityRow,
  BudgetConfigRow,
  UtilizationRow,
  RollingUsageRow,
  UtilizationHistoryRow,
  MemberPlanRow,
  ToolUsageSummaryRow,
  DailyToolUsageRow,
  TeamMemberRow,
  ReportPlanRow,
  UnclaimedMemberRow,
} from '@/lib/domain/ports';
import type { MemberReport, DailyReport, WeeklyReport, ModelReport, ProjectReport, ReportSummary } from '@/lib/domain/reporting';

// ============================================
// Usage Read
// ============================================

export class SupabaseUsageReadRepo implements UsageReadRepository {
  async getDailyUsage(sinceDate: string): Promise<DailyUsageRow[]> {
    const { data, error } = await supabase.rpc('get_daily_usage', { since_date: sinceDate });
    if (error) throw error;
    return data || [];
  }

  async getMemberUsage(sinceDate: string): Promise<MemberUsageRow[]> {
    const { data, error } = await supabase.rpc('get_member_usage', { since_date: sinceDate });
    if (error) throw error;
    return data || [];
  }

  async getMemberUsagePeriod(startDate: string, endDate: string): Promise<MemberUsageRow[]> {
    const { data, error } = await supabase.rpc('get_member_usage_period', { start_date: startDate, end_date: endDate });
    if (error) throw error;
    return data || [];
  }

  async getModelDistribution(sinceDate: string): Promise<ModelDistributionRow[]> {
    const { data, error } = await supabase.rpc('get_model_distribution', { since_date: sinceDate });
    if (error) throw error;
    return data || [];
  }

  async getSessionCount(sinceDate: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_session_count', { since_date: sinceDate });
    if (error) throw error;
    return data || 0;
  }

  async getTotalTurns(sinceDate: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_total_turns', { since_date: sinceDate });
    if (error) throw error;
    return data || 0;
  }

  async getMemberSessionCount(sinceDate: string): Promise<MemberSessionCountRow[]> {
    const { data, error } = await supabase.rpc('get_member_session_count', { since_date: sinceDate });
    if (error) throw error;
    return data || [];
  }
}

// ============================================
// Member Read
// ============================================

export class SupabaseMemberReadRepo implements MemberReadRepository {
  async getAllMembers(): Promise<TeamMemberRow[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select('id, name, display_name, email, created_at')
      .order('name');
    if (error) throw error;
    return (data || []).map((m) => ({
      id: m.id,
      name: m.name,
      displayName: m.display_name || m.email || m.name,
      createdAt: m.created_at,
    }));
  }
}

// ============================================
// Budget
// ============================================

export class SupabaseBudgetRepo implements BudgetRepository {
  async getMemberBudgetUsage(periodType: string, periodStart: string): Promise<BudgetUsageRow[]> {
    const { data, error } = await supabase.rpc('get_member_budget_usage', {
      period_type: periodType,
      period_start: periodStart,
    });
    if (error) throw error;
    return data || [];
  }

  async getUsageVelocity(sinceDate: string): Promise<VelocityRow[]> {
    const { data, error } = await supabase.rpc('get_usage_velocity', { since_date: sinceDate });
    if (error) throw error;
    return data || [];
  }

  async upsertBudget(memberId: string | null, budgetType: string, budgetUsd: number): Promise<void> {
    const { error } = await supabase.rpc('upsert_budget', {
      p_member_id: memberId,
      p_budget_type: budgetType,
      p_budget_usd: budgetUsd,
    });
    if (error) throw error;
  }

  async getAllBudgets(): Promise<BudgetConfigRow[]> {
    const { data, error } = await supabase
      .from('budget_configs')
      .select('id, member_id, budget_type, budget_usd')
      .order('budget_type');
    if (error) throw error;
    return (data || []).map((b) => ({
      id: b.id,
      memberId: b.member_id,
      budgetType: b.budget_type as 'weekly' | 'monthly',
      budgetUsd: b.budget_usd,
    }));
  }
}

// ============================================
// Utilization Read
// ============================================

export class SupabaseUtilizationReadRepo implements UtilizationReadRepository {
  async getLatestUtilization(): Promise<UtilizationRow[]> {
    const { data, error } = await supabase.rpc('get_latest_utilization');
    if (error) throw error;
    return data || [];
  }

  async getRollingUsage5h(): Promise<RollingUsageRow[]> {
    const { data, error } = await supabase.rpc('get_rolling_usage_5h');
    if (error) throw error;
    return data || [];
  }

  async getRollingUsage7d(): Promise<RollingUsageRow[]> {
    const { data, error } = await supabase.rpc('get_rolling_usage_7d');
    if (error) throw error;
    return data || [];
  }

  async getUtilizationHistory(sinceDate: string): Promise<UtilizationHistoryRow[]> {
    const { data, error } = await supabase.rpc('get_utilization_history', { since_date: sinceDate });
    if (error) throw error;
    return data || [];
  }
}

// ============================================
// Plan
// ============================================

export class SupabasePlanRepo implements PlanRepository {
  async getAllMemberPlans(): Promise<MemberPlanRow[]> {
    const { data, error } = await supabase
      .from('member_plans')
      .select('id, member_id, plan_name, billing_start, is_personal, note, team_members(name, display_name, email)')
      .order('created_at');
    if (error) throw error;
    return (data || []).map((p: Record<string, unknown>) => {
      const tm = p.team_members as Record<string, string> | null;
      return {
      id: p.id as string,
      memberId: p.member_id as string,
      displayName: tm?.display_name || tm?.email || tm?.name || '',
      planName: p.plan_name as string,
      billingStart: p.billing_start as string,
      isPersonal: p.is_personal as boolean,
      note: p.note as string | null,
    };
    });
  }

  async upsertMemberPlan(
    memberId: string, planName: string, billingStart: string,
    isPersonal: boolean, note: string | null,
  ): Promise<void> {
    const { error } = await supabase
      .from('member_plans')
      .upsert({
        member_id: memberId, plan_name: planName, billing_start: billingStart,
        is_personal: isPersonal, note, updated_at: new Date().toISOString(),
      }, { onConflict: 'member_id' });
    if (error) throw error;
  }
}

// ============================================
// Tool Usage Read
// ============================================

export class SupabaseToolUsageReadRepo implements ToolUsageReadRepository {
  async getToolUsageSummary(sinceDate: string): Promise<ToolUsageSummaryRow[]> {
    const { data, error } = await supabase.rpc('get_tool_usage_summary', { since_date: sinceDate });
    if (error) throw error;
    return data || [];
  }

  async getDailyToolUsage(sinceDate: string): Promise<DailyToolUsageRow[]> {
    const { data, error } = await supabase.rpc('get_daily_tool_usage', { since_date: sinceDate });
    if (error) throw error;
    return data || [];
  }
}

// ============================================
// Report (concurrent RPC aggregation + plan join)
// ============================================

export class SupabaseReportRepo implements ReportRepository {
  async getReportMembers(sinceDate: string): Promise<MemberReport[]> {
    const { data, error } = await supabase.rpc('get_report_members', { since_date: sinceDate });
    if (error) throw error;
    return (data || []).map((r: Record<string, unknown>) => ({
      memberId: r.memberId as string,
      displayName: r.displayName as string,
      name: r.name as string,
      cost: r.cost as number,
      sessions: Number(r.sessions),
      activeDays: Number(r.activeDays),
    }));
  }

  async getReportDaily(sinceDate: string): Promise<DailyReport[]> {
    const { data, error } = await supabase.rpc('get_report_daily', { since_date: sinceDate });
    if (error) throw error;
    return (data || []).map((r: Record<string, unknown>) => ({
      date: r.date as string,
      cost: r.cost as number,
      sessions: Number(r.sessions),
      members: Number(r.members),
    }));
  }

  async getReportWeekly(sinceDate: string): Promise<WeeklyReport[]> {
    const { data, error } = await supabase.rpc('get_report_weekly', { since_date: sinceDate });
    if (error) throw error;
    return (data || []).map((r: Record<string, unknown>) => ({
      weekStart: r.weekStart as string,
      cost: r.cost as number,
      sessions: Number(r.sessions),
      members: Number(r.members),
    }));
  }

  async getReportModels(sinceDate: string): Promise<ModelReport[]> {
    const { data, error } = await supabase.rpc('get_report_models', { since_date: sinceDate });
    if (error) throw error;
    return (data || []).map((r: Record<string, unknown>) => ({
      model: r.model as string,
      cost: r.cost as number,
      sessions: Number(r.sessions),
    }));
  }

  async getReportProjects(sinceDate: string): Promise<ProjectReport[]> {
    const { data, error } = await supabase.rpc('get_report_projects', { since_date: sinceDate });
    if (error) throw error;
    return (data || []).map((r: Record<string, unknown>) => ({
      project: r.project as string,
      cost: r.cost as number,
      sessions: Number(r.sessions),
      members: Number(r.members),
    }));
  }

  async getReportSummary(sinceDate: string): Promise<ReportSummary> {
    const { data, error } = await supabase.rpc('get_report_summary', { since_date: sinceDate });
    if (error) throw error;
    const r = (data || [])[0] || {};
    return {
      totalCost: (r as Record<string, unknown>).totalCost as number || 0,
      totalSessions: Number((r as Record<string, unknown>).totalSessions) || 0,
      totalMembers: Number((r as Record<string, unknown>).totalMembers) || 0,
      periodStart: ((r as Record<string, unknown>).periodStart as string) || '',
      periodEnd: ((r as Record<string, unknown>).periodEnd as string) || '',
    };
  }

  async getMemberPlansForReport(): Promise<ReportPlanRow[]> {
    const { data, error } = await supabase.from('member_plans')
      .select('member_id, plan_name, billing_start, is_personal, email, card_type, company_supported, note, team_members!inner(name, display_name, account_type)')
      .eq('team_members.account_type' as 'member_id', 'company');

    if (error) throw error;

    return (data || []).map((p: Record<string, unknown>) => {
      const tm = p.team_members as unknown as { name: string; display_name: string };
      return {
        memberId: p.member_id,
        displayName: tm?.display_name || (p.email as string) || tm?.name || '',
        planName: p.plan_name,
        billingStart: p.billing_start,
        isPersonal: p.is_personal,
        email: (p.email as string) || '',
        cardType: (p.card_type as string) || 'corporate',
        companySupported: (p.company_supported as boolean) ?? true,
      };
    });
  }
}

// ============================================
// Claim (member claiming with batch lookup)
// ============================================

export class SupabaseClaimRepo implements ClaimRepository {
  async getUnclaimedMembersWithCounts(): Promise<UnclaimedMemberRow[]> {
    const db = supabase;

    // Get unclaimed members
    const { data: members, error } = await db
      .from('team_members')
      .select('id, name, created_at')
      .is('email', null);

    if (error) throw error;
    if (!members || members.length === 0) return [];

    // Batch count usage records for all unclaimed members in one query
    const memberIds = members.map((m) => m.id);
    const { data: counts, error: countError } = await db
      .from('usage_records')
      .select('member_id')
      .in('member_id', memberIds);

    if (countError) throw countError;

    // Count per member
    const countMap = new Map<string, number>();
    for (const row of counts || []) {
      countMap.set(row.member_id, (countMap.get(row.member_id) || 0) + 1);
    }

    return members.map((m) => ({
      name: m.name,
      recordCount: countMap.get(m.id) || 0,
      firstSeen: m.created_at,
    }));
  }

  async findMemberByName(name: string): Promise<{ id: string; email: string | null } | null> {
    const { data, error } = await supabase
      .from('team_members')
      .select('id, email')
      .eq('name', name)
      .single();

    if (error || !data) return null;
    return { id: data.id, email: data.email };
  }

  async claimMember(memberId: string, email: string): Promise<void> {
    // First check if display_name needs auto-setting
    const { data: member } = await supabase
      .from('team_members')
      .select('name, display_name')
      .eq('id', memberId)
      .single();

    const updates: Record<string, string> = {
      email,
      claimed_at: new Date().toISOString(),
    };

    // Auto-set display_name to member name on claim if not already set
    if (member && !member.display_name) {
      updates.display_name = member.name;
    }

    const { error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', memberId);

    if (error) throw error;
  }
}

// ============================================
// Helper: compute sinceDate from days
// ============================================

export function sinceFromDays(days: number): string {
  return new Date(systemClock.now().getTime() - days * 86400000).toISOString();
}

export function weekStart(): Date {
  return getWeekStart(systemClock.now());
}

export function weekStartByOffset(offset: number): Date {
  return getWeekStartByOffset(offset, systemClock.now());
}

export function monthStart(): Date {
  return getMonthStart(systemClock.now());
}
