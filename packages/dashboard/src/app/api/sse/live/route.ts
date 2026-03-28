import { NextRequest } from 'next/server';
import { liveSubscriptionManager } from '@/lib/container';

export const dynamic = 'force-dynamic';

const MAX_LIVE_SSE_CONNECTIONS = 50;

export async function GET(request: NextRequest) {
  // No auth check — /live is public for venue display

  // Connection limit — prevent resource exhaustion
  if (liveSubscriptionManager.subscriberCount >= MAX_LIVE_SSE_CONNECTIONS) {
    return new Response(JSON.stringify({ error: 'Too many connections' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Always use days=1 (covers the event day)
  const days = 1;
  const clientId = `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
        const initialState = await liveSubscriptionManager.subscribe(
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
        liveSubscriptionManager.unsubscribe(days, clientId);
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
