// Supabase adapters implementing team repository ports.
// Each class wraps Supabase RPC/query calls — no domain logic.

import { supabase } from '@/lib/db';
import type {
  TeamReadRepository,
  TeamWriteRepository,
  HackathonTeamRow,
  TeamMemberUsageRow,
  TeamWithMembersRow,
} from '@/lib/domain/ports';

export class SupabaseTeamReadRepo implements TeamReadRepository {
  async getTeamLeaderboard(sinceDate: string): Promise<HackathonTeamRow[]> {
    const { data, error } = await supabase.rpc('get_team_leaderboard', {
      since_date: sinceDate,
    });
    if (error) throw error;
    return (data ?? []) as HackathonTeamRow[];
  }

  async getTeamMemberUsage(
    teamId: string,
    sinceDate: string,
  ): Promise<TeamMemberUsageRow[]> {
    const { data, error } = await supabase.rpc('get_team_member_usage', {
      p_team_id: teamId,
      since_date: sinceDate,
    });
    if (error) throw error;
    return (data ?? []) as TeamMemberUsageRow[];
  }

  async getAllTeamsWithMembers(): Promise<TeamWithMembersRow[]> {
    const { data, error } = await supabase.rpc('get_all_teams_with_members');
    if (error) throw error;
    return (data ?? []) as TeamWithMembersRow[];
  }
}

export class SupabaseTeamWriteRepo implements TeamWriteRepository {
  async createTeam(
    name: string,
    displayName?: string,
    color?: string,
  ): Promise<string> {
    const { data, error } = await supabase
      .from('hackathon_teams')
      .insert({ name, display_name: displayName ?? null, color: color ?? null })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  async addMemberToTeam(teamId: string, memberId: string): Promise<void> {
    const { error } = await supabase
      .from('team_memberships')
      .insert({ team_id: teamId, member_id: memberId });
    if (error) throw error;
  }

  async removeMemberFromTeam(teamId: string, memberId: string): Promise<void> {
    const { error } = await supabase
      .from('team_memberships')
      .delete()
      .match({ team_id: teamId, member_id: memberId });
    if (error) throw error;
  }

  async deleteTeam(teamId: string): Promise<void> {
    const { error } = await supabase
      .from('hackathon_teams')
      .delete()
      .eq('id', teamId);
    if (error) throw error;
  }
}
