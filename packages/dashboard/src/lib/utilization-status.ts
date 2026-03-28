export type PaceStatus = 'ahead' | 'on-track' | 'behind';

type PaceStatusArgs = {
  usedPercent: number | null;
  resetAt: string | null;
  nowMs?: number;
  durationMs: number;
};

export const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatDurationParts(deltaMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(deltaMs / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return '<1m';
}

export function formatRelativeAge(recordedAt: string, nowMs: number = Date.now()): string {
  const recordedAtMs = Date.parse(recordedAt);
  if (!Number.isFinite(recordedAtMs)) return 'updated recently';
  const deltaMs = Math.max(0, nowMs - recordedAtMs);
  return `${formatDurationParts(deltaMs)} ago`;
}

export function formatResetEta(resetAt: string | null, nowMs: number = Date.now()): string | null {
  if (!resetAt) return null;
  const resetAtMs = Date.parse(resetAt);
  if (!Number.isFinite(resetAtMs)) return null;
  const deltaMs = resetAtMs - nowMs;
  if (deltaMs <= 0) return 'Resets soon';
  return `Resets in ${formatDurationParts(deltaMs)}`;
}

export function getPaceStatus({
  usedPercent,
  resetAt,
  durationMs,
  nowMs = Date.now(),
}: PaceStatusArgs): PaceStatus | null {
  if (usedPercent === null || !Number.isFinite(usedPercent) || !resetAt) return null;
  const resetAtMs = Date.parse(resetAt);
  if (!Number.isFinite(resetAtMs) || durationMs <= 0) return null;

  const periodStartMs = resetAtMs - durationMs;
  const elapsedMs = nowMs - periodStartMs;
  if (elapsedMs <= 0 || nowMs >= resetAtMs) return null;

  const elapsedFraction = elapsedMs / durationMs;
  if (elapsedFraction < 0.05) return null;

  const projectedPercent = usedPercent / elapsedFraction;
  if (projectedPercent <= 80) return 'ahead';
  if (projectedPercent <= 100) return 'on-track';
  return 'behind';
}

export function getPaceDotColor(status: PaceStatus | null): string | null {
  if (status === 'ahead') return '#22c55e';
  if (status === 'on-track') return '#f59e0b';
  if (status === 'behind') return '#ef4444';
  return null;
}
