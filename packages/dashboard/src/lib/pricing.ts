type Pricing = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
};

const flatRate = (input: number, output: number, cacheRead = 0, cacheWrite = 0): Pricing => ({
  input,
  output,
  cacheRead,
  cacheWrite,
});

// Single source of truth for Claude / OpenAI / Gemini model pricing (USD per 1M tokens)
export const MODEL_PRICING: Record<string, Pricing> = {
  'claude-opus-4-6': flatRate(5, 25, 0.50, 6.25),
  'claude-opus-4-5': flatRate(5, 25, 0.50, 6.25),
  'claude-sonnet-4-6': flatRate(3, 15, 0.30, 3.75),
  'claude-sonnet-4-5': flatRate(3, 15, 0.30, 3.75),
  'claude-haiku-4-5': flatRate(1, 5, 0.10, 1.25),

  'gpt-5.4-pro': flatRate(30, 180, 0, 0),
  'gpt-5.4': flatRate(2.50, 15, 0.25, 0),
  'gpt-5.3-codex': flatRate(1.75, 14, 0.175, 0),
  'gpt-5.2': flatRate(1.75, 14, 0.175, 0),
  'gpt-5.2-codex': flatRate(1.75, 14, 0.175, 0),
  'gpt-5.1-codex-max': flatRate(1.25, 10, 0.125, 0),
  'gpt-5.1-codex': flatRate(1.25, 10, 0.125, 0),
  'gpt-5.1': flatRate(1.25, 10, 0.125, 0),
  'gpt-5.1-codex-mini': flatRate(0.25, 2, 0.025, 0),
  'gpt-5-codex': flatRate(1.25, 10, 0.125, 0),
  'gpt-5': flatRate(1.25, 10, 0.125, 0),
  'gpt-5-mini': flatRate(0.25, 2, 0.025, 0),
  'gpt-5-nano': flatRate(0.05, 0.4, 0.005, 0),
  'gpt-5-pro': flatRate(15, 120, 0, 0),
  'gpt-4o': flatRate(2.50, 10, 1.25, 0),

  'gemini-3.1-pro-preview': flatRate(2, 12, 0.20, 0),
  'gemini-3-pro-preview': flatRate(2, 12, 0.20, 0),
  'gemini-3.1-flash-lite-preview': flatRate(0.25, 1.50, 0.025, 0),
  'gemini-3-flash-preview': flatRate(0.50, 3, 0.05, 0),
  'gemini-2.5-pro': flatRate(1.25, 10, 0.125, 0),
  'gemini-2.5-flash': flatRate(0.30, 2.50, 0.03, 0),
  'gemini-2.5-flash-lite': flatRate(0.10, 0.40, 0.01, 0),
  'gemini-2.0-flash': flatRate(0.10, 0.40, 0.025, 0),
  'gemini-2.0-flash-lite': flatRate(0.075, 0.30, 0, 0),
};

const MODEL_ALIASES: Record<string, string> = {
  'claude-opus-4.6': 'claude-opus-4-6',
  'claude-opus-4.5': 'claude-opus-4-5',
  'claude-sonnet-4.6': 'claude-sonnet-4-6',
  'claude-sonnet-4.5': 'claude-sonnet-4-5',
  'claude-haiku-4.5': 'claude-haiku-4-5',

  'gpt-5.2-pro': 'gpt-5-pro',

  'gemini-3.1-flash-lite': 'gemini-3.1-flash-lite-preview',
  'gemini-3.1-pro': 'gemini-3.1-pro-preview',
  'gemini-3.1-pro-high': 'gemini-3.1-pro-preview',
  'gemini-3.1-pro-medium': 'gemini-3.1-pro-preview',
  'gemini-3.1-pro-low': 'gemini-3.1-pro-preview',
  'gemini-3-pro': 'gemini-3-pro-preview',
  'gemini-3-pro-high': 'gemini-3-pro-preview',
  'gemini-3-pro-medium': 'gemini-3-pro-preview',
  'gemini-3-pro-low': 'gemini-3-pro-preview',
  'antigravity-gemini-3-flash': 'gemini-3-flash-preview',
  'antigravity-gemini-3-pro': 'gemini-3-pro-preview',
  'antigravity-gemini-3-pro-high': 'gemini-3-pro-preview',
  'antigravity-gemini-3-pro-medium': 'gemini-3-pro-preview',
  'antigravity-gemini-3-pro-low': 'gemini-3-pro-preview',
  'antigravity-gemini-3.1-pro': 'gemini-3.1-pro-preview',
  'antigravity-gemini-3.1-pro-high': 'gemini-3.1-pro-preview',
  'antigravity-gemini-3.1-pro-medium': 'gemini-3.1-pro-preview',
  'antigravity-gemini-3.1-pro-low': 'gemini-3.1-pro-preview',
};

const PROVIDER_PREFIXES = [
  'models/',
  'models.',
  'openai/',
  'openai.',
  'anthropic/',
  'anthropic.',
  'google/',
  'google.',
];

export function normalizeModelId(model: string): string {
  let normalized = typeof model === 'string' ? model.trim().toLowerCase() : '';
  if (!normalized) return '';

  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const prefix of PROVIDER_PREFIXES) {
      if (normalized.startsWith(prefix)) {
        normalized = normalized.slice(prefix.length);
        stripped = true;
      }
    }
  }

  normalized = normalized
    .replace(/^claude-(opus|sonnet|haiku)-(\d)\.(\d)/, 'claude-$1-$2-$3')
    .replace(/^gemini-2\.5-flash-preview(?:-.+)?$/, 'gemini-2.5-flash')
    .replace(/^gemini-2\.5-flash-lite-preview(?:-.+)?$/, 'gemini-2.5-flash-lite')
    .replace(/^gemini-3\.1-flash-lite-preview(?:-.+)?$/, 'gemini-3.1-flash-lite-preview')
    .replace(/^gemini-3\.1-pro-preview(?:-.+)?$/, 'gemini-3.1-pro-preview')
    .replace(/^gemini-3-pro-preview(?:-.+)?$/, 'gemini-3-pro-preview')
    .replace(/^gemini-3-flash-preview(?:-.+)?$/, 'gemini-3-flash-preview');

  return normalized;
}

export function resolveModelKey(model: string): string {
  const normalized = normalizeModelId(model);
  if (!normalized) return 'claude-sonnet-4-6';
  if (MODEL_PRICING[normalized]) return normalized;
  if (MODEL_ALIASES[normalized]) return MODEL_ALIASES[normalized];

  const aliasPrefixMatch = Object.entries(MODEL_ALIASES)
    .filter(([alias]) => normalized.startsWith(alias))
    .sort((a, b) => b[0].length - a[0].length)[0];
  if (aliasPrefixMatch) return aliasPrefixMatch[1];

  const pricingPrefixMatch = Object.keys(MODEL_PRICING)
    .filter((key) => normalized.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];
  if (pricingPrefixMatch) return pricingPrefixMatch;

  if (normalized.startsWith('gpt-')) return 'gpt-5';

  if (normalized.startsWith('gemini-')) {
    if (normalized.includes('flash-lite')) {
      return normalized.startsWith('gemini-3.1')
        ? 'gemini-3.1-flash-lite-preview'
        : 'gemini-2.5-flash-lite';
    }
    if (normalized.includes('flash')) {
      return normalized.startsWith('gemini-3')
        ? 'gemini-3-flash-preview'
        : 'gemini-2.5-flash';
    }
    if (normalized.includes('pro')) {
      if (normalized.startsWith('gemini-3.1')) return 'gemini-3.1-pro-preview';
      if (normalized.startsWith('gemini-3')) return 'gemini-3-pro-preview';
      return 'gemini-2.5-pro';
    }
    return 'gemini-2.5-flash';
  }

  return 'claude-sonnet-4-6';
}

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number = 0,
  cacheReadTokens: number = 0,
): number {
  const key = resolveModelKey(model);
  const pricing = MODEL_PRICING[key];
  return (
    inputTokens * pricing.input +
    outputTokens * pricing.output +
    cacheCreationTokens * pricing.cacheWrite +
    cacheReadTokens * pricing.cacheRead
  ) / 1_000_000;
}
