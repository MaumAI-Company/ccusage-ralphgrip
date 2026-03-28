// Composition root — wires adapters to domain services.
// Singletons instantiated once at module load (boot time).
// Route handlers import from here, never from adapters directly.

import { systemClock } from '@/lib/domain/ports';
import { UsageService } from '@/lib/domain/usage-service';
import { StatsService, invalidateStatsCache } from '@/lib/domain/stats-service';
import { ReportService } from '@/lib/domain/report-service';
import { BudgetService } from '@/lib/domain/budget-service';
import { PlanService } from '@/lib/domain/plan-service';
import { ClaimService } from '@/lib/domain/claim-service';
import { ProfileService } from '@/lib/domain/profile-service';
import { DeviceChallengeService } from '@/lib/domain/device-challenge-service';
import { RefreshTokenService } from '@/lib/domain/refresh-token-service';
import { AllowlistService } from '@/lib/domain/allowlist-service';
import { SubscriptionManager } from '@/lib/domain/subscription-manager';
import {
  SupabaseUsageRecordRepo,
  SupabaseMemberRepo,
  SupabaseToolUsageRepo,
  SupabaseUtilizationRepo,
} from '@/lib/adapters/supabase-usage-repo';
import {
  SupabaseUsageReadRepo,
  SupabaseMemberReadRepo,
  SupabaseBudgetRepo,
  SupabaseUtilizationReadRepo,
  SupabasePlanRepo,
  SupabaseToolUsageReadRepo,
  SupabaseReportRepo,
  SupabaseClaimRepo,
} from '@/lib/adapters/supabase-read-repos';
import { SupabaseProfileRepo } from '@/lib/adapters/supabase-profile-repo';
import {
  SupabaseDeviceChallengeRepo,
  SupabaseRefreshTokenRepo,
  SupabaseAllowlistRepo,
} from '@/lib/adapters/supabase-auth-repos';
import { loadAppConfig } from '@/lib/adapters/env-config';

// Write-side adapter singletons
const usageRecordRepo = new SupabaseUsageRecordRepo();
const memberWriteRepo = new SupabaseMemberRepo();
const toolUsageWriteRepo = new SupabaseToolUsageRepo();
const utilizationWriteRepo = new SupabaseUtilizationRepo();

// Read-side adapter singletons
const usageReadRepo = new SupabaseUsageReadRepo();
const memberReadRepo = new SupabaseMemberReadRepo();
const budgetRepo = new SupabaseBudgetRepo();
const utilizationReadRepo = new SupabaseUtilizationReadRepo();
const planRepo = new SupabasePlanRepo();
const toolUsageReadRepo = new SupabaseToolUsageReadRepo();
const reportRepo = new SupabaseReportRepo();
const claimRepo = new SupabaseClaimRepo();
const profileRepo = new SupabaseProfileRepo();

// Auth adapter singletons
const deviceChallengeRepo = new SupabaseDeviceChallengeRepo();
const refreshTokenRepo = new SupabaseRefreshTokenRepo();
const allowlistRepo = new SupabaseAllowlistRepo();

// Domain service singletons
export const statsService = new StatsService(
  usageReadRepo,
  memberReadRepo,
  budgetRepo,
  utilizationReadRepo,
  planRepo,
  toolUsageReadRepo,
  systemClock,
);

// SSE subscription manager — connects usage ingestion to live dashboard updates
export const statsSubscriptionManager = new SubscriptionManager<number, Awaited<ReturnType<StatsService['getAll']>>>({
  fetcher: (days) => statsService.getAll(days),
  queryKey: (days) => `stats-${days}`,
});

/** Invalidate both StatsService cache and SubscriptionManager state. */
export function invalidateStats(): void {
  invalidateStatsCache();
  statsSubscriptionManager.invalidate();
}

export const usageService = new UsageService(
  usageRecordRepo,
  memberWriteRepo,
  toolUsageWriteRepo,
  utilizationWriteRepo,
  systemClock,
  () => {
    invalidateStatsCache();
    statsSubscriptionManager.notifyUpdate();
  },
);

export const reportService = new ReportService(
  reportRepo,
  systemClock,
);

export const budgetService = new BudgetService(
  budgetRepo,
  memberReadRepo,
);

export const planService = new PlanService(planRepo);

export const claimService = new ClaimService(claimRepo);

export const profileService = new ProfileService(profileRepo);

export const deviceChallengeService = new DeviceChallengeService(deviceChallengeRepo);

export const refreshTokenService = new RefreshTokenService(refreshTokenRepo);

export const allowlistService = new AllowlistService(allowlistRepo, loadAppConfig);
