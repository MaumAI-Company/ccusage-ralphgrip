import { describe, it, expect } from 'vitest';
import { calculatePreviousPeriodTop } from './ranking';

describe('calculatePreviousPeriodTop', () => {
  it('subtracts current period from cumulative and sorts by cost', () => {
    const cumulative = [
      { displayName: 'Alice', totalCost: 100, totalTokens: 50000 },
      { displayName: 'Bob', totalCost: 80, totalTokens: 40000 },
    ];
    const current = [
      { displayName: 'Alice', totalCost: 30, totalTokens: 15000 },
      { displayName: 'Bob', totalCost: 60, totalTokens: 30000 },
    ];

    const result = calculatePreviousPeriodTop(cumulative, current);
    expect(result).toEqual([
      { displayName: 'Alice', totalCost: 70, totalTokens: 35000 },
      { displayName: 'Bob', totalCost: 20, totalTokens: 10000 },
    ]);
  });

  it('filters out members with zero or negative previous cost', () => {
    const cumulative = [
      { displayName: 'Alice', totalCost: 50, totalTokens: 25000 },
      { displayName: 'Bob', totalCost: 30, totalTokens: 15000 },
    ];
    const current = [
      { displayName: 'Alice', totalCost: 50, totalTokens: 25000 }, // exactly equal
      { displayName: 'Bob', totalCost: 40, totalTokens: 20000 },   // more than cumulative
    ];

    const result = calculatePreviousPeriodTop(cumulative, current);
    expect(result).toEqual([]);
  });

  it('respects the limit parameter', () => {
    const cumulative = [
      { displayName: 'A', totalCost: 100, totalTokens: 1 },
      { displayName: 'B', totalCost: 80, totalTokens: 1 },
      { displayName: 'C', totalCost: 60, totalTokens: 1 },
    ];
    const result = calculatePreviousPeriodTop(cumulative, [], 2);
    expect(result).toHaveLength(2);
    expect(result[0].displayName).toBe('A');
    expect(result[1].displayName).toBe('B');
  });

  it('handles empty inputs', () => {
    expect(calculatePreviousPeriodTop([], [])).toEqual([]);
    expect(calculatePreviousPeriodTop([], [{ displayName: 'A', totalCost: 10, totalTokens: 1 }])).toEqual([]);
  });

  it('handles members only in cumulative (not in current)', () => {
    const cumulative = [{ displayName: 'Alice', totalCost: 50, totalTokens: 25000 }];
    const result = calculatePreviousPeriodTop(cumulative, []);
    expect(result).toEqual([{ displayName: 'Alice', totalCost: 50, totalTokens: 25000 }]);
  });
});
