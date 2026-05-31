// Compact 0..100 score chips for the six quality dimensions.
interface Scores {
  uniqueness: number;
  readability: number;
  engagement: number;
  brandAlignment: number;
  localRelevance: number;
  aiSearch: number;
}

const DIMS: { key: keyof Scores; label: string }[] = [
  { key: 'uniqueness', label: 'Unique' },
  { key: 'readability', label: 'Read' },
  { key: 'engagement', label: 'Engage' },
  { key: 'brandAlignment', label: 'Brand' },
  { key: 'localRelevance', label: 'Local' },
  { key: 'aiSearch', label: 'AI' },
];

function color(v: number): string {
  if (v >= 0.66) return 'var(--success)';
  if (v >= 0.4) return 'var(--warning)';
  return 'var(--danger)';
}

export default function ScoreBadges({ scores }: { scores: Scores }) {
  return (
    <div className="row" style={{ gap: 4 }}>
      {DIMS.map((d) => (
        <span
          key={d.key}
          className="tag"
          title={`${d.label}: ${Math.round(scores[d.key] * 100)}%`}
          style={{ borderColor: color(scores[d.key]) }}
        >
          {d.label} {Math.round(scores[d.key] * 100)}
        </span>
      ))}
    </div>
  );
}
