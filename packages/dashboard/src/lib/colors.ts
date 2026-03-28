// 24 maximally-distinct member colors — consistent across all charts
export const MEMBER_COLORS = [
  '#6366f1', // indigo
  '#f43f5e', // rose
  '#10b981', // emerald
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#8b5cf6', // violet
  '#f97316', // orange
  '#14b8a6', // teal
  '#e11d48', // crimson
  '#0ea5e9', // sky
  '#d946ef', // fuchsia
  '#22d3ee', // light cyan
  '#a3e635', // yellow-green
  '#7c3aed', // purple
  '#fb923c', // light orange
  '#2dd4bf', // aqua
  '#c084fc', // lavender
  '#fbbf24', // gold
  '#34d399', // mint
  '#f472b6', // light pink
  '#38bdf8', // light blue
  '#a78bfa', // periwinkle
];

export function getMemberColor(name: string): string {
  if (!name) return MEMBER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}
