// 로컬 개발용 더미 데이터 (Supabase 미설정 시 사용)

const MEMBERS = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Charlie' },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Diana' },
];

const MODELS = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5'];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateDailyUsage(days: number) {
  const rows: {
    date: string;
    displayName: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    costUsd: number;
  }[] = [];

  for (let d = 0; d < days; d++) {
    const date = new Date(Date.now() - d * 86400000);
    const dateStr = date.toISOString().slice(0, 10);

    for (const member of MEMBERS) {
      // 주말은 사용량 적음
      const dayOfWeek = date.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const multiplier = isWeekend ? 0.2 : 1;

      // 일부 날짜는 스킵 (비활성)
      if (Math.random() < 0.15) continue;

      for (const model of MODELS) {
        if (Math.random() < 0.4) continue; // 모든 모델을 매일 쓰지는 않음

        const input = Math.floor(randomBetween(5000, 80000) * multiplier);
        const output = Math.floor(randomBetween(1000, 30000) * multiplier);
        const cost = model.includes('opus')
          ? (input * 15 + output * 75) / 1_000_000
          : model.includes('sonnet')
            ? (input * 3 + output * 15) / 1_000_000
            : (input * 0.8 + output * 4) / 1_000_000;

        rows.push({
          date: dateStr,
          displayName: member.name,
          model,
          inputTokens: input,
          outputTokens: output,
          cacheCreationTokens: Math.floor(input * 0.1),
          cacheReadTokens: Math.floor(input * 0.3),
          costUsd: Math.round(cost * 1000) / 1000,
        });
      }
    }
  }

  return rows;
}

export function getMockStats(days: number) {
  const daily = generateDailyUsage(days);

  // Member usage
  const memberTotals = new Map<string, { cost: number; tokens: number }>();
  for (const d of daily) {
    const prev = memberTotals.get(d.displayName) || { cost: 0, tokens: 0 };
    prev.cost += d.costUsd;
    prev.tokens += d.inputTokens + d.outputTokens;
    memberTotals.set(d.displayName, prev);
  }
  const members = Array.from(memberTotals.entries())
    .map(([displayName, v]) => ({ displayName, totalCost: v.cost, totalTokens: v.tokens }))
    .sort((a, b) => b.totalCost - a.totalCost);

  // Model distribution
  const modelTotals = new Map<string, { count: number; cost: number }>();
  for (const d of daily) {
    const prev = modelTotals.get(d.model) || { count: 0, cost: 0 };
    prev.count++;
    prev.cost += d.costUsd;
    modelTotals.set(d.model, prev);
  }
  const models = Array.from(modelTotals.entries())
    .map(([model, v]) => ({ model, count: v.count, totalCost: v.cost }))
    .sort((a, b) => b.totalCost - a.totalCost);

  // Team members
  const teamMembers = MEMBERS.map(m => ({ id: m.id, name: m.name }));

  // Weekly budgets
  const weeklyBudgets = MEMBERS.map(m => ({
    memberId: m.id,
    displayName: m.name,
    budgetUsd: 50,
    usedUsd: randomBetween(5, 45),
    usagePercent: 0,
  }));
  weeklyBudgets.forEach(b => { b.usagePercent = (b.usedUsd / b.budgetUsd) * 100; });

  // Monthly budgets
  const monthlyBudgets = MEMBERS.map(m => ({
    memberId: m.id,
    displayName: m.name,
    budgetUsd: 200,
    usedUsd: randomBetween(30, 180),
    usagePercent: 0,
  }));
  monthlyBudgets.forEach(b => { b.usagePercent = (b.usedUsd / b.budgetUsd) * 100; });

  // Velocity
  const velocity = MEMBERS.map(m => ({
    memberId: m.id,
    displayName: m.name,
    dailyAvgUsd: randomBetween(2, 12),
    activeDays: Math.floor(randomBetween(3, 7)),
  }));

  // Budget configs
  const budgetConfigs = [
    { id: 'bc-team-weekly', memberId: null, budgetType: 'weekly' as const, budgetUsd: 50 },
    { id: 'bc-team-monthly', memberId: null, budgetType: 'monthly' as const, budgetUsd: 200 },
  ];

  // Session count
  const sessionCount = Math.floor(randomBetween(50, 200));

  // Rolling usage
  const rolling5h = MEMBERS.map(m => ({
    memberId: m.id,
    displayName: m.name,
    totalCostUsd: randomBetween(0, 8),
    totalInputTokens: Math.floor(randomBetween(10000, 200000)),
    totalOutputTokens: Math.floor(randomBetween(5000, 80000)),
    sessionCount: Math.floor(randomBetween(1, 5)),
  }));

  const rolling7d = MEMBERS.map(m => ({
    memberId: m.id,
    displayName: m.name,
    totalCostUsd: randomBetween(5, 50),
    totalInputTokens: Math.floor(randomBetween(100000, 1000000)),
    totalOutputTokens: Math.floor(randomBetween(50000, 400000)),
    sessionCount: Math.floor(randomBetween(10, 40)),
  }));

  // Utilization - only some members have recent snapshots
  const utilization = MEMBERS.slice(0, 2).map(m => ({
    memberId: m.id,
    displayName: m.name,
    fiveHourPct: randomBetween(10, 85),
    sevenDayPct: randomBetween(20, 70),
    recordedAt: new Date().toISOString(),
  }));

  // Historical utilization snapshots (every ~6 hours for each member)
  const utilizationHistory: typeof utilization = [];
  for (let h = days * 24; h >= 0; h -= 6) {
    const time = new Date(Date.now() - h * 3600000);
    const dayOfWeek = time.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    for (const member of MEMBERS) {
      const memberIdx = MEMBERS.indexOf(member);
      const phase = memberIdx * 1.5;
      const weekendFactor = isWeekend ? 0.3 : 1;
      const fiveBase = 30 + 25 * Math.sin((h + phase) / 8) * weekendFactor;
      const sevenBase = 40 + 15 * Math.sin((h + phase) / 24) * weekendFactor;
      utilizationHistory.push({
        memberId: member.id,
        displayName: member.name,
        fiveHourPct: Math.max(0, Math.min(100, fiveBase + randomBetween(-8, 8))),
        sevenDayPct: Math.max(0, Math.min(100, sevenBase + randomBetween(-5, 5))),
        recordedAt: time.toISOString(),
      });
    }
  }

  return {
    daily,
    members,
    models,
    teamMembers,
    weeklyBudgets,
    monthlyBudgets,
    velocity,
    budgetConfigs,
    sessionCount,
    rolling5h,
    rolling7d,
    utilization,
    utilizationHistory,
  };
}
