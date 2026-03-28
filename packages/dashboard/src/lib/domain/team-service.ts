import type {
  TeamReadRepository,
  TeamWriteRepository,
  HackathonTeamRow,
  TeamMemberUsageRow,
} from './ports';

export interface GroupedTeam {
  teamId: string;
  teamName: string;
  teamDisplayName: string;
  teamColor: string | null;
  members: Array<{ memberId: string; memberName: string }>;
}

export class TeamService {
  constructor(
    private teamRead: TeamReadRepository,
    private teamWrite: TeamWriteRepository,
  ) {}

  async getLeaderboard(sinceDate: string): Promise<HackathonTeamRow[]> {
    return this.teamRead.getTeamLeaderboard(sinceDate);
  }

  async getTeamMembers(
    teamId: string,
    sinceDate: string,
  ): Promise<TeamMemberUsageRow[]> {
    return this.teamRead.getTeamMemberUsage(teamId, sinceDate);
  }

  async getAllTeamsGrouped(): Promise<GroupedTeam[]> {
    const rows = await this.teamRead.getAllTeamsWithMembers();
    const map = new Map<string, GroupedTeam>();
    for (const row of rows) {
      if (!map.has(row.teamId)) {
        map.set(row.teamId, {
          teamId: row.teamId,
          teamName: row.teamName,
          teamDisplayName: row.teamDisplayName,
          teamColor: row.teamColor,
          members: [],
        });
      }
      if (row.memberId) {
        map.get(row.teamId)!.members.push({
          memberId: row.memberId,
          memberName: row.memberName ?? 'Unknown',
        });
      }
    }
    return Array.from(map.values());
  }

  async createTeam(
    name: string,
    displayName?: string,
    color?: string,
  ): Promise<string> {
    return this.teamWrite.createTeam(name, displayName, color);
  }

  async assignMember(teamId: string, memberId: string): Promise<void> {
    return this.teamWrite.addMemberToTeam(teamId, memberId);
  }

  async removeMember(teamId: string, memberId: string): Promise<void> {
    return this.teamWrite.removeMemberFromTeam(teamId, memberId);
  }

  async deleteTeam(teamId: string): Promise<void> {
    return this.teamWrite.deleteTeam(teamId);
  }
}
