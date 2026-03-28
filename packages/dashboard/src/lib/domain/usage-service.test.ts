import { describe, it, expect, beforeEach } from 'vitest';
import { UsageService } from './usage-service';
import {
  MockUsageRecordWriteRepo, MockMemberWriteRepo,
  MockToolUsageWriteRepo, MockUtilizationWriteRepo, fixedClock,
} from '@/lib/test-utils/mock-repos';

describe('UsageService', () => {
  let usageRecords: MockUsageRecordWriteRepo;
  let members: MockMemberWriteRepo;
  let toolUsage: MockToolUsageWriteRepo;
  let utilization: MockUtilizationWriteRepo;
  let service: UsageService;

  beforeEach(() => {
    usageRecords = new MockUsageRecordWriteRepo();
    members = new MockMemberWriteRepo();
    toolUsage = new MockToolUsageWriteRepo();
    utilization = new MockUtilizationWriteRepo();
    service = new UsageService(usageRecords, members, toolUsage, utilization, fixedClock());
  });

  const baseRecords = [{ model: 'claude-sonnet-4-6', inputTokens: 100, outputTokens: 50,
    cacheCreationTokens: 0, cacheReadTokens: 0, projectName: 'test', recordedAt: '2026-03-24T10:00:00Z' }];

  describe('member identity resolution', () => {
    it('resolves member by authenticated email (primary identity)', async () => {
      const result = await service.ingestReport({
        memberName: 'alice', authenticatedEmail: 'alice@test.com',
        sessionId: 'ses-1', records: baseRecords,
      });
      expect(result).toEqual({ ok: true });
      // Email is the primary identity — getOrCreateByEmail should be called
      expect(members.getOrCreateByEmailCalls).toEqual(['alice@test.com']);
      // memberName should NOT be used for identity
      expect(members.getOrCreateByNameCalls).toHaveLength(0);
    });

    it('falls back to memberName for unauthenticated reports', async () => {
      const result = await service.ingestReport({
        memberName: 'alice', sessionId: 'ses-1', records: baseRecords,
      });
      expect(result).toEqual({ ok: true });
      expect(members.getOrCreateByNameCalls).toEqual(['alice']);
      expect(members.getOrCreateByEmailCalls).toHaveLength(0);
    });

    it('resolves by email even without memberName', async () => {
      const result = await service.ingestReport({
        authenticatedEmail: 'bob@co.com', sessionId: 'ses-2', records: baseRecords,
      });
      expect(result).toEqual({ ok: true });
      expect(members.getOrCreateByEmailCalls).toEqual(['bob@co.com']);
    });

    it('returns error when neither memberName nor email provided', async () => {
      const result = await service.ingestReport({ sessionId: 'ses-3', records: baseRecords });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain('memberName or authenticated email');
    });

    it('uses same memberId for all writes within a report', async () => {
      members.membersByEmail.set('alice@test.com', 'uuid-alice');
      await service.ingestReport({
        authenticatedEmail: 'alice@test.com', sessionId: 'ses-1', records: baseRecords,
        toolUsage: [{ toolName: 'Read', callCount: 5, acceptCount: 4, rejectCount: 1 }],
        utilization: { fiveHour: 42.5, sevenDay: 18, fiveHourResetsAt: '2026-03-24T15:00:00Z', sevenDayResetsAt: '2026-03-31T00:00:00Z' },
      });
      expect(usageRecords.calls[0].memberId).toBe('uuid-alice');
      expect(toolUsage.calls[0].memberId).toBe('uuid-alice');
      expect(utilization.calls[0].memberId).toBe('uuid-alice');
    });
  });

  describe('email linking for unclaimed records', () => {
    it('links email when both memberName and email provided (unclaimed record claiming)', async () => {
      members.membersByName.set('alice', 'uuid-unclaimed');
      await service.ingestReport({
        memberName: 'alice', authenticatedEmail: 'alice@test.com',
        sessionId: 'ses-1', records: baseRecords,
      });
      // Email takes priority, so getOrCreateByEmail is called, not getOrCreateByName
      expect(members.getOrCreateByEmailCalls).toEqual(['alice@test.com']);
    });

    it('does not call linkEmail when only email provided (already authenticated)', async () => {
      await service.ingestReport({
        authenticatedEmail: 'bob@co.com', sessionId: 'ses-2', records: baseRecords,
      });
      expect(members.linkEmailCalls).toHaveLength(0);
    });

    it('continues when email linking fails', async () => {
      members.shouldThrow = true;
      const result = await service.ingestReport({
        memberName: 'alice', authenticatedEmail: 'alice@test.com',
        sessionId: 'ses-1', records: baseRecords,
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('record processing', () => {
    it('returns message when all records are synthetic', async () => {
      const result = await service.ingestReport({
        memberName: 'alice', sessionId: 'ses-1',
        records: [{ ...baseRecords[0], model: '<synthetic>' }],
      });
      expect(result).toEqual({ ok: true, message: 'No valid records after filtering' });
      expect(usageRecords.calls).toHaveLength(0);
    });

    it('saves tool usage when provided', async () => {
      await service.ingestReport({
        memberName: 'alice', sessionId: 'ses-1', records: baseRecords,
        toolUsage: [{ toolName: 'Read', callCount: 5, acceptCount: 4, rejectCount: 1 }],
      });
      expect(toolUsage.calls).toHaveLength(1);
    });

    it('skips tool usage when empty', async () => {
      await service.ingestReport({
        memberName: 'alice', sessionId: 'ses-1', records: baseRecords, toolUsage: [],
      });
      expect(toolUsage.calls).toHaveLength(0);
    });

    it('saves utilization when provided', async () => {
      await service.ingestReport({
        memberName: 'alice', sessionId: 'ses-1', records: baseRecords,
        utilization: { fiveHour: 42.5, sevenDay: 18, fiveHourResetsAt: '2026-03-24T15:00:00Z', sevenDayResetsAt: '2026-03-31T00:00:00Z' },
      });
      expect(utilization.calls).toHaveLength(1);
      expect(utilization.calls[0].fiveHourPct).toBe(42.5);
    });

    it('skips utilization when all null', async () => {
      await service.ingestReport({
        memberName: 'alice', sessionId: 'ses-1', records: baseRecords,
        utilization: { fiveHour: null, sevenDay: null, fiveHourResetsAt: null, sevenDayResetsAt: null },
      });
      expect(utilization.calls).toHaveLength(0);
    });
  });
});
