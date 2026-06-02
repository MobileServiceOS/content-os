// Display formatting shared across the analytics UI.

/** 1234 -> "1.2K", 1_200_000 -> "1.2M". Integers under 1000 shown as-is. */
export function compact(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(n / 1_000)}K`;
  return `${Math.round(n)}`;
}

function trim(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

/** 0.61 -> "61%". */
export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** 1200 -> "$1,200". */
export function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** 0..1 score -> CSS color (matches ScoreBadges thresholds). */
export function scoreColor(v: number): string {
  if (v >= 0.66) return 'var(--success)';
  if (v >= 0.4) return 'var(--warning)';
  return 'var(--danger)';
}
