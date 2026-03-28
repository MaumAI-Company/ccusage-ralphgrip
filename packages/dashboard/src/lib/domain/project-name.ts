// Pure project name formatting — extracts the last path segment from hyphenated paths.
// Used server-side in ReportService to sanitize paths before sending to the client.

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
