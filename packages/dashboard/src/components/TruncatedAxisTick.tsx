/** Custom YAxis tick that truncates long labels and shows full text on hover via SVG <title>. */
interface TruncatedAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  maxChars?: number;
  fill?: string;
  fontSize?: number;
}

export function TruncatedAxisTick({
  x = 0,
  y = 0,
  payload,
  maxChars = 14,
  fill = '#a1a1aa',
  fontSize = 11,
}: TruncatedAxisTickProps) {
  const value = payload?.value ?? '';
  const truncated = value.length > maxChars
    ? value.slice(0, maxChars - 1) + '\u2026'
    : value;

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{value}</title>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill={fill}
        fontSize={fontSize}
      >
        {truncated}
      </text>
    </g>
  );
}
