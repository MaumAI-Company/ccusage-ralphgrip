// Pure time calculation functions — KST timezone math, week/month boundaries.
// All functions accept a Date parameter (from Clock port) — no Date.now() calls.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Get the start of the KST week (Monday 00:00 KST) as UTC Date */
export function getWeekStart(now: Date): Date {
  const nowKST = new Date(now.getTime() + KST_OFFSET_MS);
  const day = nowKST.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday-based
  const monday = new Date(nowKST);
  monday.setUTCDate(nowKST.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return new Date(monday.getTime() - KST_OFFSET_MS);
}

/** Get the start of a week offset from the given reference time */
export function getWeekStartByOffset(offset: number, now: Date): Date {
  const base = getWeekStart(now);
  const result = new Date(base);
  result.setUTCDate(result.getUTCDate() + offset * 7);
  return result;
}

/** Get the start of the KST month (1st 00:00 KST) as UTC Date */
export function getMonthStart(now: Date): Date {
  const nowKST = new Date(now.getTime() + KST_OFFSET_MS);
  const kstMidnight = new Date(Date.UTC(nowKST.getUTCFullYear(), nowKST.getUTCMonth(), 1));
  return new Date(kstMidnight.getTime() - KST_OFFSET_MS);
}

/** Get ISO date string for N days before the given time */
export function sinceDate(days: number, now: Date): string {
  return new Date(now.getTime() - days * 86400000).toISOString();
}

/** Get the Monday (KST) for a given date — used in report weekly grouping */
export function getKSTMondayForDate(date: Date): string {
  const dateKST = new Date(date.getTime() + KST_OFFSET_MS);
  const day = dateKST.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(dateKST);
  monday.setUTCDate(dateKST.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

/** @deprecated Use getKSTMondayForDate instead */
export const getUTCMondayForDate = getKSTMondayForDate;
