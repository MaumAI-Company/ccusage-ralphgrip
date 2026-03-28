// Generic subscription manager with round-robin per-client push.
// Pure domain service — no I/O dependencies.
//
// Key design: round-robin queue. Each query entry maintains an ordered queue
// of subscribers. A single recurring timer fires at interval = throttleMs / queueSize,
// pushing to one client per tick. This guarantees every client receives an update
// within throttleMs (15s default).
//
// State is fetched lazily: notifyUpdate()/invalidate() drop cached state,
// and the next push tick fetches fresh data before sending. Subsequent ticks
// reuse the cached state until the next invalidation.
//
// Two independent flags:
//   dirty  — a push cycle is pending (clients haven't all been pushed yet)
//   state  — null means "needs fetch", non-null means "cached and ready"

const THROTTLE_MS = 15_000;
const MIN_INTERVAL_MS = 50;

type ClientCallback<TState> = (state: TState) => void;

interface QueryEntry<TState> {
  state: TState | null;
  /** True when a push cycle is pending — clients need updates. */
  dirty: boolean;
  subscribers: Map<string, ClientCallback<TState>>;
  queue: string[];
  queueIndex: number;
  pushTimer: ReturnType<typeof setTimeout> | null;
  lastPushedAt: number;
}

interface SubscriptionManagerOptions<TQuery, TState> {
  /** Fetch fresh state for a query. Called lazily at push time when state is null. */
  fetcher: (query: TQuery) => Promise<TState>;
  /** Serialize query to a cache key string. */
  queryKey: (query: TQuery) => string;
  /** Full cycle window in ms (default 15000). Each client gets one push per cycle. */
  throttleMs?: number;
}

export class SubscriptionManager<TQuery, TState> {
  private entries = new Map<string, QueryEntry<TState>>();
  private queries = new Map<string, TQuery>();
  private fetcher: (query: TQuery) => Promise<TState>;
  private queryKey: (query: TQuery) => string;
  private throttleMs: number;

  constructor(options: SubscriptionManagerOptions<TQuery, TState>) {
    this.fetcher = options.fetcher;
    this.queryKey = options.queryKey;
    this.throttleMs = options.throttleMs ?? THROTTLE_MS;
  }

  /**
   * Subscribe a client to a query. Returns current cached state (or fetches it).
   * The new client is appended to the end of the round-robin queue.
   * Adding a subscriber recalculates the push interval.
   */
  async subscribe(
    query: TQuery,
    clientId: string,
    callback: ClientCallback<TState>,
  ): Promise<TState> {
    const key = this.queryKey(query);
    let entry = this.entries.get(key);

    if (!entry) {
      entry = {
        state: null,
        dirty: false,
        subscribers: new Map(),
        queue: [],
        queueIndex: 0,
        pushTimer: null,
        lastPushedAt: 0,
      };
      this.entries.set(key, entry);
      this.queries.set(key, query);
    }

    entry.subscribers.set(clientId, callback);
    entry.queue.push(clientId);

    // Fetch fresh state if cache is empty (first sub or after invalidation)
    if (entry.state === null) {
      entry.state = await this.fetcher(query);
    }

    // Recalculate push interval with the new subscriber count.
    // Does NOT touch dirty — an active push cycle continues.
    this.reschedule(key, entry);

    return entry.state;
  }

  /**
   * Unsubscribe a client. Removes from queue and recalculates interval.
   * Cleans up entry when last subscriber leaves.
   */
  unsubscribe(query: TQuery, clientId: string): void {
    const key = this.queryKey(query);
    const entry = this.entries.get(key);
    if (!entry) return;

    entry.subscribers.delete(clientId);

    const queuePos = entry.queue.indexOf(clientId);
    if (queuePos !== -1) {
      entry.queue.splice(queuePos, 1);
      // Adjust queueIndex if the removed client was before or at current position
      if (entry.queue.length === 0) {
        entry.queueIndex = 0;
      } else if (queuePos < entry.queueIndex) {
        entry.queueIndex--;
      } else if (entry.queueIndex >= entry.queue.length) {
        entry.queueIndex = 0;
      }
    }

    if (entry.subscribers.size === 0) {
      if (entry.pushTimer) clearTimeout(entry.pushTimer);
      this.entries.delete(key);
      this.queries.delete(key);
    } else {
      this.reschedule(key, entry);
    }
  }

  /**
   * Notify that underlying data has changed (e.g., usage ingestion).
   * Drops cached state and starts a new push cycle for all entries.
   */
  notifyUpdate(): void {
    for (const [key, entry] of this.entries) {
      if (entry.subscribers.size === 0) continue;

      entry.dirty = true;
      entry.state = null;
      entry.lastPushedAt = 0;
      entry.queueIndex = 0;

      // If no push timer is running, start one
      if (!entry.pushTimer && entry.queue.length > 0) {
        this.scheduleNextPush(key, entry);
      }
    }
  }

  /**
   * Invalidate all cached state. Same as notifyUpdate but explicitly named
   * for non-ingestion mutations (e.g., display name changes).
   */
  invalidate(): void {
    this.notifyUpdate();
  }

  /** Number of active subscriptions (for monitoring). */
  get subscriberCount(): number {
    let count = 0;
    for (const entry of this.entries.values()) {
      count += entry.subscribers.size;
    }
    return count;
  }

  /** Active query keys (for monitoring). */
  get activeQueries(): string[] {
    return Array.from(this.entries.keys());
  }

  /**
   * Cancel any existing timer and schedule the next push at the correct interval.
   * Only schedules if a push cycle is active (dirty flag set).
   */
  private reschedule(key: string, entry: QueryEntry<TState>): void {
    if (entry.pushTimer) {
      clearTimeout(entry.pushTimer);
      entry.pushTimer = null;
    }

    if (entry.queue.length > 0 && entry.dirty) {
      this.scheduleNextPush(key, entry);
    }
  }

  /**
   * Schedule the next individual push tick.
   */
  private scheduleNextPush(key: string, entry: QueryEntry<TState>): void {
    if (entry.queue.length === 0) return;

    const interval = Math.max(
      MIN_INTERVAL_MS,
      this.throttleMs / entry.queue.length,
    );

    let delay: number;
    if (entry.lastPushedAt === 0) {
      delay = interval;
    } else {
      const timeSinceLastPush = Date.now() - entry.lastPushedAt;
      delay = Math.max(0, interval - timeSinceLastPush);
    }

    entry.pushTimer = setTimeout(() => {
      entry.pushTimer = null;
      this.pushNext(key, entry);
    }, delay);
  }

  /**
   * Push state to the next client in the round-robin queue.
   * Fetches fresh state if null, then sends to one client and advances.
   * Schedules the next push if there are more clients to serve in this cycle.
   */
  private async pushNext(key: string, entry: QueryEntry<TState>): Promise<void> {
    if (entry.queue.length === 0 || entry.subscribers.size === 0) return;

    const query = this.queries.get(key);
    if (!query) return;

    // Fetch fresh state if cache was dropped
    if (entry.state === null) {
      try {
        entry.state = await this.fetcher(query);
      } catch (err) {
        console.error(`SSE: failed to refresh state for ${key}:`, err);
        this.scheduleNextPush(key, entry);
        return;
      }
    }

    // Push to current client
    const clientId = entry.queue[entry.queueIndex];
    const callback = entry.subscribers.get(clientId);
    if (callback) {
      callback(entry.state);
    }

    entry.lastPushedAt = Date.now();
    entry.queueIndex = (entry.queueIndex + 1) % entry.queue.length;

    // Full cycle complete — stop until next notifyUpdate()
    if (entry.queueIndex === 0) {
      entry.dirty = false;
      return;
    }

    this.scheduleNextPush(key, entry);
  }

  /** Clean up all entries and timers. */
  destroy(): void {
    for (const entry of this.entries.values()) {
      if (entry.pushTimer) clearTimeout(entry.pushTimer);
    }
    this.entries.clear();
    this.queries.clear();
  }
}
