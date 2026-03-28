import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUtilizationResponse } from './utilization.mjs';

test('normalizeUtilizationResponse includes reset timestamps when present', () => {
  assert.deepEqual(normalizeUtilizationResponse({
    five_hour: { utilization: 12.3, reset_at: '2026-03-19T05:00:00.000Z' },
    seven_day: { utilization: 45.6, resets_at: '2026-03-23T00:00:00.000Z' },
  }), {
    fiveHour: 12.3,
    sevenDay: 45.6,
    fiveHourResetsAt: '2026-03-19T05:00:00.000Z',
    sevenDayResetsAt: '2026-03-23T00:00:00.000Z',
  });
});

test('normalizeUtilizationResponse keeps missing values nullable', () => {
  assert.deepEqual(normalizeUtilizationResponse({}), {
    fiveHour: null,
    sevenDay: null,
    fiveHourResetsAt: null,
    sevenDayResetsAt: null,
  });
});
