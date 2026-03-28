const FLAT_RATE = (input, output, cacheRead = 0, cacheWrite = 0) => ({
  input,
  output,
  cacheRead,
  cacheWrite,
});

export const MODEL_PRICING = {
  // Anthropic Claude API pricing (https://platform.claude.com/docs/en/about-claude/pricing)
  'claude-opus-4-6': FLAT_RATE(5, 25, 0.50, 6.25),
  'claude-opus-4-5': FLAT_RATE(5, 25, 0.50, 6.25),
  'claude-sonnet-4-6': FLAT_RATE(3, 15, 0.30, 3.75),
  'claude-sonnet-4-5': FLAT_RATE(3, 15, 0.30, 3.75),
  'claude-haiku-4-5': FLAT_RATE(1, 5, 0.10, 1.25),

  // OpenAI API pricing (https://developers.openai.com/api/docs/pricing)
  'gpt-5.4-pro': FLAT_RATE(30, 180, 0, 0),
  'gpt-5.4': FLAT_RATE(2.50, 15, 0.25, 0),
  'gpt-5.4-mini': FLAT_RATE(0.75, 4.50, 0.075, 0),
  'gpt-5.4-nano': FLAT_RATE(0.20, 1.25, 0.02, 0),
  'gpt-5.3-codex': FLAT_RATE(1.75, 14, 0.175, 0),
  'gpt-5.3-chat-latest': FLAT_RATE(1.75, 14, 0.175, 0),
  'codex-mini-latest': FLAT_RATE(1.50, 6, 0.375, 0),
  'gpt-5.2': FLAT_RATE(1.75, 14, 0.175, 0),
  'gpt-5.2-codex': FLAT_RATE(1.75, 14, 0.175, 0),
  'gpt-5.1-codex-max': FLAT_RATE(1.25, 10, 0.125, 0),
  'gpt-5.1-codex': FLAT_RATE(1.25, 10, 0.125, 0),
  'gpt-5.1': FLAT_RATE(1.25, 10, 0.125, 0),
  'gpt-5.1-codex-mini': FLAT_RATE(0.25, 2, 0.025, 0),
  'gpt-5-codex': FLAT_RATE(1.25, 10, 0.125, 0),
  'gpt-5': FLAT_RATE(1.25, 10, 0.125, 0),
  'gpt-5-mini': FLAT_RATE(0.25, 2, 0.025, 0),
  'gpt-5-nano': FLAT_RATE(0.05, 0.4, 0.005, 0),
  'gpt-5-pro': FLAT_RATE(15, 120, 0, 0),
  'gpt-4o': FLAT_RATE(2.50, 10, 1.25, 0),

  // Gemini Developer API pricing (https://ai.google.dev/gemini-api/docs/pricing)
  'gemini-3.1-pro-preview': FLAT_RATE(2, 12, 0.20, 0),
  'gemini-3-pro-preview': FLAT_RATE(2, 12, 0.20, 0),
  'gemini-3.1-flash-lite-preview': FLAT_RATE(0.25, 1.50, 0.025, 0),
  'gemini-3-flash-preview': FLAT_RATE(0.50, 3, 0.05, 0),
  'gemini-2.5-pro': FLAT_RATE(1.25, 10, 0.125, 0),
  'gemini-2.5-flash': FLAT_RATE(0.30, 2.50, 0.03, 0),
  'gemini-2.5-flash-lite': FLAT_RATE(0.10, 0.40, 0.01, 0),
  'gemini-2.0-flash': FLAT_RATE(0.10, 0.40, 0.025, 0),
  'gemini-2.0-flash-lite': FLAT_RATE(0.075, 0.30, 0, 0),
};

const MODEL_ALIASES = {
  'claude-opus-4.6': 'claude-opus-4-6',
  'claude-opus-4.5': 'claude-opus-4-5',
  'claude-sonnet-4.6': 'claude-sonnet-4-6',
  'claude-sonnet-4.5': 'claude-sonnet-4-5',
  'claude-haiku-4.5': 'claude-haiku-4-5',

  'gpt-5.2-pro': 'gpt-5-pro',
  'codex-mini': 'codex-mini-latest',

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

export function normalizeModelId(model) {
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

export function resolveModelKey(model) {
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

  if (normalized.startsWith('codex-')) return 'codex-mini-latest';

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

export function estimateCost(model, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens) {
  const key = resolveModelKey(model);
  const pricing = MODEL_PRICING[key];
  return (
    inputTokens * pricing.input +
    outputTokens * pricing.output +
    cacheCreationTokens * pricing.cacheWrite +
    cacheReadTokens * pricing.cacheRead
  ) / 1_000_000;
}
