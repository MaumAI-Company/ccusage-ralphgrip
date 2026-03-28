// Pure report aggregation functions — no DB or HTTP dependencies.
// Accepts raw record arrays and returns aggregated results.

import { getKSTMondayForDate } from './time';

/** Raw usage record as returned from DB query */
export interface RawUsageRecord {
  costUsd: number;
  sessionId: string;
  recordedAt: string;
  memberId: string;
  memberName: string;
  memberDisplayName: string;
  model: string;
  projectName: string;
}

export interface MemberReport {
  memberId: string;
  displayName: string;
  name: string;
  cost: number;
  sessions: number;
  activeDays: number;
}

export interface DailyReport {
  date: string;
  cost: number;
  sessions: number;
  members: number;
}

export interface WeeklyReport {
  weekStart: string;
  cost: number;
  sessions: number;
  members: number;
}

export interface ModelReport {
  model: string;
  cost: number;
  sessions: number;
}

export interface ProjectReport {
  project: string;
  cost: number;
  sessions: number;
  members: number;
}

export interface ReportSummary {
  totalCost: number;
  totalSessions: number;
  totalMembers: number;
  periodStart: string;
  periodEnd: string;
}

function roundCost(n: number): number {
  return Math.round(n * 100) / 100;
}

export function aggregateByMember(records: RawUsageRecord[]): MemberReport[] {
  const map = new Map<string, {
    displayName: string; name: string; cost: number;
    sessions: Set<string>; activeDays: Set<string>;
  }>();

  for (const r of records) {
    if (!map.has(r.memberId)) {
      map.set(r.memberId, {
        displayName: r.memberDisplayName || r.memberName,
        name: r.memberName,
        cost: 0,
        sessions: new Set(),
        activeDays: new Set(),
      });
    }
    const m = map.get(r.memberId)!;
    m.cost += r.costUsd;
    m.sessions.add(r.sessionId);
    m.activeDays.add(r.recordedAt.slice(0, 10));
  }

  return Array.from(map.entries())
    .map(([id, m]) => ({
      memberId: id,
      displayName: m.displayName,
      name: m.name,
      cost: roundCost(m.cost),
      sessions: m.sessions.size,
      activeDays: m.activeDays.size,
    }))
    .sort((a, b) => b.cost - a.cost);
}

export function aggregateByDate(records: RawUsageRecord[]): DailyReport[] {
  const map = new Map<string, { cost: number; sessions: Set<string>; members: Set<string> }>();

  for (const r of records) {
    const date = r.recordedAt.slice(0, 10);
    if (!map.has(date)) map.set(date, { cost: 0, sessions: new Set(), members: new Set() });
    const d = map.get(date)!;
    d.cost += r.costUsd;
    d.sessions.add(r.sessionId);
    d.members.add(r.memberId);
  }

  return Array.from(map.entries())
    .map(([date, d]) => ({ date, cost: roundCost(d.cost), sessions: d.sessions.size, members: d.members.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateByWeek(records: RawUsageRecord[]): WeeklyReport[] {
  const map = new Map<string, { cost: number; sessions: Set<string>; members: Set<string> }>();

  for (const r of records) {
    const weekStart = getKSTMondayForDate(new Date(r.recordedAt));
    if (!map.has(weekStart)) map.set(weekStart, { cost: 0, sessions: new Set(), members: new Set() });
    const w = map.get(weekStart)!;
    w.cost += r.costUsd;
    w.sessions.add(r.sessionId);
    w.members.add(r.memberId);
  }

  return Array.from(map.entries())
    .map(([weekStart, w]) => ({ weekStart, cost: roundCost(w.cost), sessions: w.sessions.size, members: w.members.size }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export function aggregateByModel(records: RawUsageRecord[]): ModelReport[] {
  const map = new Map<string, { cost: number; sessions: Set<string> }>();

  for (const r of records) {
    if (!map.has(r.model)) map.set(r.model, { cost: 0, sessions: new Set() });
    const mm = map.get(r.model)!;
    mm.cost += r.costUsd;
    mm.sessions.add(r.sessionId);
  }

  return Array.from(map.entries())
    .map(([model, mm]) => ({ model, cost: roundCost(mm.cost), sessions: mm.sessions.size }))
    .sort((a, b) => b.cost - a.cost);
}

export function aggregateByProject(records: RawUsageRecord[], limit: number = 15): ProjectReport[] {
  const map = new Map<string, { cost: number; sessions: Set<string>; members: Set<string> }>();

  for (const r of records) {
    const project = r.projectName || '(unknown)';
    if (!map.has(project)) map.set(project, { cost: 0, sessions: new Set(), members: new Set() });
    const pm = map.get(project)!;
    pm.cost += r.costUsd;
    pm.sessions.add(r.sessionId);
    pm.members.add(r.memberId);
  }

  return Array.from(map.entries())
    .map(([project, pm]) => ({ project, cost: roundCost(pm.cost), sessions: pm.sessions.size, members: pm.members.size }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, limit);
}

export function buildReportSummary(members: MemberReport[], daily: DailyReport[], records: RawUsageRecord[]): ReportSummary {
  const totalCost = members.reduce((s, m) => s + m.cost, 0);
  const totalSessions = new Set(records.map(r => r.sessionId)).size;

  return {
    totalCost: roundCost(totalCost),
    totalSessions,
    totalMembers: members.length,
    periodStart: daily[0]?.date || '',
    periodEnd: daily[daily.length - 1]?.date || '',
  };
}
