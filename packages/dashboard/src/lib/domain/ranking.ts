// Pure member ranking logic — no DB dependencies.
// Operates on pre-fetched member usage data.

export interface MemberUsage {
  displayName: string;
  totalCost: number;
  totalTokens: number;
}

/**
 * Calculate the previous period's top members by subtracting the current period
 * usage from the cumulative usage. Pure data transformation.
 */
export function calculatePreviousPeriodTop(
  cumulativeUsage: MemberUsage[],
  currentPeriodUsage: MemberUsage[],
  limit: number = 3,
): MemberUsage[] {
  const currentMap = new Map<string, { cost: number; tokens: number }>(
    currentPeriodUsage.map(m => [m.displayName, { cost: m.totalCost, tokens: m.totalTokens }]),
  );

  return cumulativeUsage
    .map(m => ({
      displayName: m.displayName,
      totalCost: m.totalCost - (currentMap.get(m.displayName)?.cost || 0),
      totalTokens: m.totalTokens - (currentMap.get(m.displayName)?.tokens || 0),
    }))
    .filter(m => m.totalCost > 0)
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, limit);
}
