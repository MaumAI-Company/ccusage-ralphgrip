import { NextRequest } from 'next/server';
import { SseStatsQuerySchema } from '@/lib/schemas';
import { statsSubscriptionManager } from '@/lib/container';
import { getAuthenticatedEmail } from '@/lib/auth/helpers';

export const dynamic = 'force-dynamic';

const MAX_SSE_CONNECTIONS = 100;

export async function GET(request: NextRequest) {
  // Auth check — SSE connections hold server resources long-term
  const email = await getAuthenticatedEmail(request);
  if (!email) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Connection limit — prevent resource exhaustion
  if (statsSubscriptionManager.subscriberCount >= MAX_SSE_CONNECTIONS) {
    return new Response(JSON.stringify({ error: 'Too many connections' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { searchParams } = new URL(request.url);
  const parseResult = SseStatsQuerySchema.safeParse({
    days: searchParams.get('days') ?? undefined,
  });

  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid days parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const days = parseResult.data.days;
  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(event: string, data: unknown) {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream already closed
        }
      }

      // Send initial state
      try {
        const initialState = await statsSubscriptionManager.subscribe(
          days,
          clientId,
          (state) => send('update', state),
        );
        send('init', initialState);
      } catch {
        send('error', { message: 'Failed to load initial state' });
        controller.close();
        return;
      }

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30_000);

      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        statsSubscriptionManager.unsubscribe(days, clientId);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
