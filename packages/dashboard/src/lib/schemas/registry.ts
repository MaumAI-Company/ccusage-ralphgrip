import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { UsageReportSchema } from './usage';
import { StatsQuerySchema } from './stats';
import { UpsertPlanSchema } from './plans';
import { UpsertBudgetSchema } from './budgets';
import { ReportQuerySchema } from './report';
import { WeeklyRankingQuerySchema } from './weekly-ranking';
import { SseStatsQuerySchema, SseEventTypeSchema } from './sse';

export const registry = new OpenAPIRegistry();

// POST /api/usage
registry.registerPath({
  method: 'post',
  path: '/api/usage',
  summary: 'Submit usage report',
  request: { body: { content: { 'application/json': { schema: UsageReportSchema } } } },
  responses: {
    200: {
      description: 'Success',
      content: { 'application/json': { schema: z.object({ success: z.boolean() }) } },
    },
  },
});

// GET /api/stats
registry.registerPath({
  method: 'get',
  path: '/api/stats',
  summary: 'Get dashboard statistics',
  request: { query: StatsQuerySchema },
  responses: {
    200: { description: 'Stats response' },
  },
});

// GET /api/plans
registry.registerPath({
  method: 'get',
  path: '/api/plans',
  summary: 'List member plans',
  responses: {
    200: { description: 'Array of member plans' },
  },
});

// POST /api/plans
registry.registerPath({
  method: 'post',
  path: '/api/plans',
  summary: 'Upsert member plan',
  request: { body: { content: { 'application/json': { schema: UpsertPlanSchema } } } },
  responses: {
    200: {
      description: 'Success',
      content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } },
    },
  },
});

// GET /api/budgets
registry.registerPath({
  method: 'get',
  path: '/api/budgets',
  summary: 'List budgets and members',
  responses: {
    200: { description: 'Budgets and members' },
  },
});

// POST /api/budgets
registry.registerPath({
  method: 'post',
  path: '/api/budgets',
  summary: 'Upsert budget',
  request: { body: { content: { 'application/json': { schema: UpsertBudgetSchema } } } },
  responses: {
    200: {
      description: 'Success',
      content: { 'application/json': { schema: z.object({ success: z.boolean() }) } },
    },
  },
});

// GET /api/report
registry.registerPath({
  method: 'get',
  path: '/api/report',
  summary: 'Get usage report',
  request: { query: ReportQuerySchema },
  responses: {
    200: { description: 'Aggregated report data' },
  },
});

// GET /api/weekly-ranking
registry.registerPath({
  method: 'get',
  path: '/api/weekly-ranking',
  summary: 'Get weekly ranking',
  request: { query: WeeklyRankingQuerySchema },
  responses: {
    200: { description: 'Weekly ranking and previous week top' },
  },
});

// GET /api/sse/stats (Server-Sent Events)
registry.registerPath({
  method: 'get',
  path: '/api/sse/stats',
  summary: 'Subscribe to live stats updates via SSE',
  request: { query: SseStatsQuerySchema },
  responses: {
    200: {
      description: 'Server-Sent Events stream with stats updates',
      content: {
        'text/event-stream': {
          schema: z.object({
            event: SseEventTypeSchema,
            data: z.unknown(),
          }),
        },
      },
    },
  },
});

export function generateOpenAPIDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'ccusage-worv Dashboard API',
      version: '1.0.0',
      description: 'Team usage collection dashboard API',
    },
  });
}
