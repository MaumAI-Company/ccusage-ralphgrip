// Supabase adapters implementing write-side repository ports.

import { supabase } from '@/lib/db';
import type {
  UsageRecordWriteRepository, MemberWriteRepository, ToolUsageWriteRepository,
  UtilizationWriteRepository, ProcessedRecord, ValidToolEntry,
} from '@/lib/domain/ports';

export class SupabaseUsageRecordRepo implements UsageRecordWriteRepository {
  async create(memberId: string, sessionId: string, records: ProcessedRecord[], turnCount?: number): Promise<void> {
    const rows = records.map((r) => ({
      member_id: memberId,
      session_id: sessionId,
      model: r.model,
      input_tokens: r.inputTokens,
      output_tokens: r.outputTokens,
      cache_creation_tokens: r.cacheCreationTokens,
      cache_read_tokens: r.cacheReadTokens,
      cost_usd: r.costUsd,
      project_name: r.projectName,
      recorded_at: r.recordedAt,
      turn_count: turnCount || 0,
    }));

    await supabase.from('usage_records').delete()
      .eq('session_id', sessionId).eq('member_id', memberId);
    const { error } = await supabase.from('usage_records').insert(rows);
    if (error) throw error;
  }
}

export class SupabaseMemberRepo implements MemberWriteRepository {
  async getOrCreateByEmail(email: string): Promise<string> {
    // Look for a member already linked to this email
    const { data: byEmail } = await supabase
      .from('team_members').select('id').eq('email', email).single();
    if (byEmail) return byEmail.id;

    // Create a new member with name = email (for new authenticated users)
    const { data: created, error } = await supabase
      .from('team_members').insert({ name: email, email }).select('id').single();
    if (error) {
      // Race condition: another request created it
      const { data: retry } = await supabase
        .from('team_members').select('id').eq('email', email).single();
      if (retry) return retry.id;
      throw error;
    }
    return created!.id;
  }

  async getOrCreateByName(name: string): Promise<string> {
    const { data: existing } = await supabase
      .from('team_members').select('id').eq('name', name).single();
    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from('team_members').insert({ name }).select('id').single();
    if (error) {
      const { data: retry } = await supabase
        .from('team_members').select('id').eq('name', name).single();
      if (retry) return retry.id;
      throw error;
    }
    return created!.id;
  }

  async linkEmail(memberId: string, email: string, authenticatedAt: Date): Promise<void> {
    await supabase.from('team_members')
      .update({ email, authenticated_at: authenticatedAt.toISOString() })
      .eq('id', memberId)
      .is('authenticated_at', null);
  }
}

export class SupabaseToolUsageRepo implements ToolUsageWriteRepository {
  async create(memberId: string, sessionId: string, entries: ValidToolEntry[], recordedAt: string): Promise<void> {
    await supabase.from('tool_usage_records').delete()
      .eq('session_id', sessionId).eq('member_id', memberId);
    if (entries.length === 0) return;
    const rows = entries.map((t) => ({
      member_id: memberId, session_id: sessionId,
      tool_name: t.toolName, call_count: t.callCount,
      accept_count: t.acceptCount, reject_count: t.rejectCount,
      recorded_at: recordedAt,
    }));
    const { error } = await supabase.from('tool_usage_records').insert(rows);
    if (error) throw error;
  }
}

export class SupabaseUtilizationRepo implements UtilizationWriteRepository {
  async create(memberId: string, fiveHourPct: number | null, sevenDayPct: number | null, fiveHourResetsAt: string | null, sevenDayResetsAt: string | null): Promise<void> {
    const row: Record<string, unknown> = {
      member_id: memberId,
      five_hour_pct: fiveHourPct,
      seven_day_pct: sevenDayPct,
    };
    // Only include resets_at columns when non-null to avoid errors if
    // the production schema hasn't been migrated to include them yet.
    if (fiveHourResetsAt !== null) row.five_hour_resets_at = fiveHourResetsAt;
    if (sevenDayResetsAt !== null) row.seven_day_resets_at = sevenDayResetsAt;
    const { error } = await supabase.from('utilization_snapshots').insert(row);
    if (error) throw error;
  }
}
