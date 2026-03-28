export function shortModelName(model: string): string {
  return model
    .replace(/^models\//, '')
    .replace(/^anthropic[/.]/, '')
    .replace(/^openai[/.]/, '')
    .replace(/^google[/.]/, '')
    .replace(/^antigravity-/, '')
    .replace('claude-', '')
    .replace(/-latest$/, '')
    .replace(/-20\d{6}$/, '')
    .replace(/-preview-\d{2}-\d{4}$/, ' preview')
    .replace(/-preview$/, ' preview');
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Extract the last segment from a path (hyphenated or slash-separated). */
export function formatProjectName(raw: string): string {
  if (!raw) return '';
  if (raw.startsWith('-') || raw.startsWith('/')) {
    const sep = raw.startsWith('/') ? '/' : '-';
    const parts = raw.split(sep).filter(Boolean);
    return parts[parts.length - 1] || raw;
  }
  return raw;
}
