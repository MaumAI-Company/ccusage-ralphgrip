import { z } from 'zod';
import { daysParam } from './common';

// SSE query params (same shape as stats query)
export const SseStatsQuerySchema = z.object({
  days: daysParam,
});

export type SseStatsQuery = z.infer<typeof SseStatsQuerySchema>;

// SSE event types
export const SseEventTypeSchema = z.enum(['init', 'update', 'heartbeat']);
export type SseEventType = z.infer<typeof SseEventTypeSchema>;
