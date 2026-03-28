// Typed route handler wrapper — eliminates try/catch and Zod validation boilerplate.
// Routes return plain data; this wrapper serializes to NextResponse.json.

import { NextRequest, NextResponse } from 'next/server';
import type { ZodType } from 'zod';

/** Thrown inside a handler to return a specific HTTP error. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface ApiHandlerOptions<TBody, TQuery> {
  body?: ZodType<TBody>;
  query?: ZodType<TQuery>;
}

interface ApiHandlerContext<TBody, TQuery> {
  request: NextRequest;
  body: TBody;
  query: TQuery;
}

/**
 * Wraps a route handler with auto try/catch, Zod validation, and JSON serialization.
 *
 * Usage:
 *   // With body parsing:
 *   export const POST = apiHandler({ body: MySchema }, async ({ body }) => { ... });
 *
 *   // With query parsing:
 *   export const GET = apiHandler({ query: QuerySchema }, async ({ query }) => { ... });
 *
 *   // No parsing (access request directly):
 *   export const GET = apiHandler({}, async ({ request }) => { ... });
 *
 *   // Return NextResponse for custom headers:
 *   const response = NextResponse.json(data);
 *   response.headers.set('Cache-Control', '...');
 *   return response;
 */
export function apiHandler<TBody = undefined, TQuery = undefined>(
  options: ApiHandlerOptions<TBody, TQuery>,
  handler: (ctx: ApiHandlerContext<TBody, TQuery>) => Promise<Record<string, unknown> | unknown[] | NextResponse>,
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    try {
      let body: TBody = undefined as TBody;
      let query: TQuery = undefined as TQuery;

      if (options.body) {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const result = options.body.safeParse(raw);
        if (!result.success) {
          const msg = result.error.issues[0]?.message ?? 'Invalid request body';
          return NextResponse.json({ error: msg }, { status: 400 });
        }
        body = result.data;
      }

      if (options.query) {
        const { searchParams } = new URL(request.url);
        const raw = Object.fromEntries(searchParams.entries());
        const result = options.query.safeParse(raw);
        if (!result.success) {
          const msg = result.error.issues[0]?.message ?? 'Invalid query parameters';
          return NextResponse.json({ error: msg }, { status: 400 });
        }
        query = result.data;
      }

      const result = await handler({ request, body, query });

      if (result instanceof NextResponse) return result;
      return NextResponse.json(result);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error('API error:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
