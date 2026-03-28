import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SubscriptionManager } from './subscription-manager';

describe('SubscriptionManager', () => {
  let fetchCount: number;
  let fetchResult: number;
  let manager: SubscriptionManager<number, number>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchCount = 0;
    fetchResult = 100;
    manager = new SubscriptionManager({
      fetcher: async () => { fetchCount++; return fetchResult; },
      queryKey: (q) => String(q),
      throttleMs: 1000,
    });
  });

  afterEach(() => {
    manager.destroy();
    vi.useRealTimers();
  });

  describe('subscribe', () => {
    it('fetches initial state on first subscribe', async () => {
      const state = await manager.subscribe(30, 'c1', () => {});
      expect(state).toBe(100);
      expect(fetchCount).toBe(1);
    });

    it('reuses cached state for subsequent subscribers', async () => {
      await manager.subscribe(30, 'c1', () => {});
      const state = await manager.subscribe(30, 'c2', () => {});
      expect(state).toBe(100);
      expect(fetchCount).toBe(1);
    });

    it('tracks subscriber count', async () => {
      await manager.subscribe(30, 'c1', () => {});
      await manager.subscribe(30, 'c2', () => {});
      expect(manager.subscriberCount).toBe(2);
    });

    it('fetches fresh state when cache was dropped (dirty)', async () => {
      await manager.subscribe(30, 'c1', () => {});
      fetchCount = 0;
      fetchResult = 777;

      // notifyUpdate drops state (null) and sets dirty
      manager.notifyUpdate();

      // New subscriber gets fresh data because state is null
      const state = await manager.subscribe(30, 'c2', () => {});
      expect(state).toBe(777);
      expect(fetchCount).toBe(1);
    });

    it('returns cached state when entry is clean', async () => {
      await manager.subscribe(30, 'c1', () => {});
      fetchCount = 0;
      fetchResult = 777;

      const state = await manager.subscribe(30, 'c2', () => {});
      expect(state).toBe(100);
      expect(fetchCount).toBe(0);
    });
  });

  describe('unsubscribe', () => {
    it('cleans up entry when last subscriber leaves', async () => {
      await manager.subscribe(30, 'c1', () => {});
      expect(manager.activeQueries).toHaveLength(1);

      manager.unsubscribe(30, 'c1');
      expect(manager.activeQueries).toHaveLength(0);
      expect(manager.subscriberCount).toBe(0);
    });

    it('keeps entry alive while other subscribers exist', async () => {
      await manager.subscribe(30, 'c1', () => {});
      await manager.subscribe(30, 'c2', () => {});
      manager.unsubscribe(30, 'c1');
      expect(manager.subscriberCount).toBe(1);
      expect(manager.activeQueries).toHaveLength(1);
    });
  });

  describe('single subscriber push', () => {
    it('pushes to subscriber after full throttle window', async () => {
      const received: number[] = [];
      await manager.subscribe(30, 'c1', (state) => received.push(state));
      fetchCount = 0;
      fetchResult = 200;

      manager.notifyUpdate();
      expect(received).toHaveLength(0);

      // With 1 subscriber, interval = 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      expect(received).toEqual([200]);
      expect(fetchCount).toBe(1);
    });

    it('stops pushing after full cycle when state is clean', async () => {
      const received: number[] = [];
      await manager.subscribe(30, 'c1', (state) => received.push(state));
      fetchResult = 200;

      manager.notifyUpdate();
      await vi.advanceTimersByTimeAsync(1000);
      expect(received).toEqual([200]);

      // No more pushes — state is clean, cycle complete
      fetchResult = 300;
      await vi.advanceTimersByTimeAsync(2000);
      expect(received).toEqual([200]); // no additional push
    });
  });

  describe('round-robin with multiple subscribers', () => {
    it('pushes to clients in round-robin order with interval = throttleMs/N', async () => {
      const received: string[] = [];

      await manager.subscribe(30, 'c1', () => received.push('c1'));
      await manager.subscribe(30, 'c2', () => received.push('c2'));
      fetchResult = 200;

      manager.notifyUpdate();

      // With 2 subscribers, interval = 500ms
      // First push at 500ms (full interval for first push in cycle)
      await vi.advanceTimersByTimeAsync(499);
      expect(received).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(1);
      expect(received).toEqual(['c1']);

      // Second push at 500ms after first
      await vi.advanceTimersByTimeAsync(500);
      expect(received).toEqual(['c1', 'c2']);
    });

    it('completes full cycle within throttleMs for 3 clients', async () => {
      const received: string[] = [];

      await manager.subscribe(30, 'c1', () => received.push('c1'));
      await manager.subscribe(30, 'c2', () => received.push('c2'));
      await manager.subscribe(30, 'c3', () => received.push('c3'));
      fetchResult = 200;

      manager.notifyUpdate();

      // interval ≈ 333ms per client, first push at 333ms
      await vi.advanceTimersByTimeAsync(334);
      expect(received).toEqual(['c1']);

      await vi.advanceTimersByTimeAsync(334);
      expect(received).toEqual(['c1', 'c2']);

      await vi.advanceTimersByTimeAsync(334);
      expect(received).toEqual(['c1', 'c2', 'c3']);
    });
  });

  describe('dynamic interval recalculation', () => {
    it('recalculates interval when subscriber is added mid-cycle', async () => {
      const received: string[] = [];

      await manager.subscribe(30, 'c1', () => received.push('c1'));
      fetchResult = 200;

      manager.notifyUpdate();

      // With 1 sub, interval = 1000ms. Advance 400ms (less than interval)
      await vi.advanceTimersByTimeAsync(400);
      expect(received).toHaveLength(0);

      // Add c2 — now interval = 500ms, timer reschedules from last push
      await manager.subscribe(30, 'c2', () => received.push('c2'));

      // With interval 500ms and lastPushedAt=0, first push fires at 500ms.
      // Since the reschedule happened at t=400, it should fire at t=900 (500ms from now)
      // or sooner if lastPushedAt was reset. Since lastPushedAt=0 (no push yet in cycle),
      // reschedule uses full interval=500ms → fires at t=900
      await vi.advanceTimersByTimeAsync(500);
      expect(received.length).toBeGreaterThanOrEqual(1);
    });

    it('recalculates interval when subscriber is removed', async () => {
      const received: string[] = [];

      await manager.subscribe(30, 'c1', () => received.push('c1'));
      await manager.subscribe(30, 'c2', () => received.push('c2'));
      fetchResult = 200;

      manager.notifyUpdate();

      // Remove c1 — now only c2 remains, interval = 1000ms
      manager.unsubscribe(30, 'c1');

      await vi.advanceTimersByTimeAsync(1000);
      expect(received).toEqual(['c2']);
    });
  });

  describe('dirty/clean cycle', () => {
    it('fetches only once per dirty period — cached for subsequent pushes', async () => {
      const received: string[] = [];

      await manager.subscribe(30, 'c1', () => received.push('c1'));
      await manager.subscribe(30, 'c2', () => received.push('c2'));
      fetchCount = 0;
      fetchResult = 200;

      manager.notifyUpdate();

      // Both clients get pushed — only one fetch
      await vi.advanceTimersByTimeAsync(1000);
      expect(received).toEqual(['c1', 'c2']);
      expect(fetchCount).toBe(1); // single fetch for both
    });

    it('re-fetches on second notifyUpdate after clean state', async () => {
      const received: number[] = [];

      await manager.subscribe(30, 'c1', (state) => received.push(state));
      fetchCount = 0;

      fetchResult = 200;
      manager.notifyUpdate();
      await vi.advanceTimersByTimeAsync(1000);
      expect(received).toEqual([200]);
      expect(fetchCount).toBe(1);

      fetchResult = 300;
      manager.notifyUpdate();
      await vi.advanceTimersByTimeAsync(1000);
      expect(received).toEqual([200, 300]);
      expect(fetchCount).toBe(2);
    });

    it('coalesces multiple notifyUpdate calls into one fetch', async () => {
      const received: number[] = [];

      await manager.subscribe(30, 'c1', (state) => received.push(state));
      fetchCount = 0;

      manager.notifyUpdate();
      manager.notifyUpdate();
      manager.notifyUpdate();

      await vi.advanceTimersByTimeAsync(1000);
      expect(fetchCount).toBe(1);
    });

    it('sends latest state (latest-wins)', async () => {
      const received: number[] = [];
      await manager.subscribe(30, 'c1', (state) => received.push(state));

      fetchResult = 200;
      manager.notifyUpdate();

      fetchResult = 300;
      manager.notifyUpdate();

      await vi.advanceTimersByTimeAsync(1000);
      expect(received).toEqual([300]);
    });
  });

  describe('invalidate', () => {
    it('drops cached state and schedules re-fetch for subscribers', async () => {
      const received: number[] = [];
      await manager.subscribe(30, 'c1', (state) => received.push(state));
      fetchCount = 0;
      fetchResult = 999;

      manager.invalidate();
      await vi.advanceTimersByTimeAsync(1000);

      expect(fetchCount).toBe(1);
      expect(received).toEqual([999]);
    });

    it('causes subscribe to re-fetch when state was invalidated', async () => {
      await manager.subscribe(30, 'c1', () => {});
      fetchCount = 0;
      fetchResult = 500;

      manager.invalidate();

      const state = await manager.subscribe(30, 'c2', () => {});
      expect(state).toBe(500);
      expect(fetchCount).toBe(1);
    });

    it('is a no-op when no subscribers exist', () => {
      manager.invalidate();
      expect(manager.subscriberCount).toBe(0);
    });

    it('invalidates multiple query entries', async () => {
      await manager.subscribe(7, 'c1', () => {});
      await manager.subscribe(30, 'c2', () => {});
      fetchCount = 0;

      manager.invalidate();
      await vi.advanceTimersByTimeAsync(1000);

      expect(fetchCount).toBe(2);
    });
  });

  describe('cleanup', () => {
    it('clears pending timers on unsubscribe', async () => {
      await manager.subscribe(30, 'c1', () => {});
      manager.notifyUpdate();

      manager.unsubscribe(30, 'c1');
      expect(manager.activeQueries).toHaveLength(0);
    });

    it('no timers running with 0 subscribers', async () => {
      // Fresh manager — no subscribers, no timers
      expect(manager.subscriberCount).toBe(0);

      // Subscribe and unsubscribe — should clean up
      await manager.subscribe(30, 'c1', () => {});
      manager.notifyUpdate();
      manager.unsubscribe(30, 'c1');

      // Advance time — nothing should happen (no errors)
      await vi.advanceTimersByTimeAsync(5000);
      expect(manager.subscriberCount).toBe(0);
    });

    it('destroy clears all entries and timers', async () => {
      await manager.subscribe(30, 'c1', () => {});
      await manager.subscribe(7, 'c2', () => {});
      manager.notifyUpdate();

      manager.destroy();
      expect(manager.subscriberCount).toBe(0);
      expect(manager.activeQueries).toHaveLength(0);
    });
  });
});
