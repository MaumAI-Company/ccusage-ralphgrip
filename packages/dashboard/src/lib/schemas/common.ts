import { z } from 'zod';

/** Max string lengths used across the API */
export const MAX_STRING_LENGTH = 256;
export const MAX_SESSION_ID_LENGTH = 512;
export const MAX_MEMBER_NAME_LENGTH = 80;
export const MAX_TOKENS = 100_000_000;
export const MAX_RECORDS_PER_REPORT = 100;

/**
 * Allowed characters for member/display names:
 * Latin letters, Korean characters (syllables + jamo), digits,
 * spaces, hyphens, periods, and apostrophes.
 */
const NAME_ALLOWED_RE = /[^a-zA-Z\u3131-\u3163\uac00-\ud7a3\uD55C0-9 \-.']/g;

/** Strip disallowed chars, collapse multiple spaces, trim */
export function sanitizeName(raw: string): string {
  return raw
    .replace(NAME_ALLOWED_RE, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/** Non-empty member name — sanitized, max 80 chars */
export const memberName = z
  .string()
  .transform(sanitizeName)
  .pipe(z.string().min(1, 'Member name cannot be empty').max(MAX_MEMBER_NAME_LENGTH));

/** Session ID — non-empty, up to 512 chars */
export const sessionId = z.string().min(1).max(MAX_SESSION_ID_LENGTH);

/** ISO 8601 date string */
export const isoDate = z.string().refine(
  (s) => !isNaN(new Date(s).getTime()),
  { message: 'Invalid ISO date string' },
);

/** Optional ISO date: string | null, normalizes empty string to null */
export const optionalIsoDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined || v === '') return null;
    return isNaN(new Date(v).getTime()) ? null : v;
  });

/** UUID v4 string */
export const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid UUID format',
);

/** Non-negative integer */
export const nonNegInt = z.number().int().nonnegative();

/** Non-negative integer capped at MAX_TOKENS */
export const tokenCount = z.number().int().nonnegative().max(MAX_TOKENS);

/** Model name — non-empty, max length */
export const modelName = z.string().min(1).max(MAX_STRING_LENGTH);

/** Days query param: 1-365, default 30 */
export const daysParam = z.coerce.number().int().min(1).max(365).default(30);

/** Budget type enum */
export const budgetType = z.enum(['weekly', 'monthly']);
