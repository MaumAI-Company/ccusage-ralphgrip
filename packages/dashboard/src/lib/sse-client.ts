// SSE client for live dashboard updates.
// Uses EventSource to subscribe to /api/sse/stats and receive typed events.
// Falls back to polling if SSE connection fails.

import { useEffect, useRef, useState, useCallback } from 'react';
import type { StatsResponse } from './api-client';
import type { SseEventType } from './schemas/sse';

const POLL_INTERVAL_MS = 60_000;
const RECONNECT_DELAY_MS = 3_000;

interface UseStatsSSEResult {
  stats: StatsResponse | null;
  connected: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * React hook that subscribes to SSE stats updates.
 * Returns typed StatsResponse and connection state.
 * Falls back to polling on connection failure.
 */
export function useStatsSSE(days: number): UseStatsSSEResult {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  // Dedup: skip setStats when server sends identical data (prevents
  // redundant re-renders during SSE reconnect / polling overlap).
  const lastJsonRef = useRef<string>('');

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const fetchOnce = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/stats?days=${days}`, { signal });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const text = await res.text();
      if (!mountedRef.current) return;
      setError(null);
      if (text === lastJsonRef.current) return; // identical — skip re-render
      lastJsonRef.current = text;
      const data: StatsResponse = JSON.parse(text);
      setStats(data);
    } catch (err) {
      if (signal?.aborted) return;
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
    }
  }, [days]);

  const startPolling = useCallback(() => {
    stopPolling();
    // Initial fetch
    void fetchOnce();
    pollTimerRef.current = setInterval(() => void fetchOnce(), POLL_INTERVAL_MS);
  }, [fetchOnce, stopPolling]);

  const refresh = useCallback(() => {
    void fetchOnce();
  }, [fetchOnce]);

  useEffect(() => {
    mountedRef.current = true;

    // SSE not supported — fall back to polling
    if (typeof EventSource === 'undefined') {
      startPolling();
      return () => {
        mountedRef.current = false;
        stopPolling();
      };
    }

    function connect() {
      if (!mountedRef.current) return;

      const es = new EventSource(`/api/sse/stats?days=${days}`);
      eventSourceRef.current = es;

      function handleEvent(eventType: SseEventType, event: MessageEvent) {
        if (!mountedRef.current) return;
        try {
          const json = event.data as string;
          const changed = json !== lastJsonRef.current;
          if (changed) {
            lastJsonRef.current = json;
            setStats(JSON.parse(json) as StatsResponse);
            setError(null);
          }
          if (eventType === 'init') {
            setConnected(true);
            stopPolling();
          }
        } catch {
          // Ignore malformed events
        }
      }

      es.addEventListener('init', (e) => handleEvent('init', e as MessageEvent));
      es.addEventListener('update', (e) => handleEvent('update', e as MessageEvent));

      es.onerror = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        es.close();
        eventSourceRef.current = null;

        // Start polling as fallback while we wait to reconnect
        if (!pollTimerRef.current) {
          startPolling();
        }

        // Clear any pending reconnect before scheduling a new one
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, RECONNECT_DELAY_MS);
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      stopPolling();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [days, startPolling, stopPolling]);

  return { stats, connected, error, refresh };
}
