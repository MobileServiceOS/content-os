// Content Fingerprint Viewer (admins/owners). Shows each generated output's
// similarity score, its closest matching previous content, and how many times
// the engine regenerated before accepting it.
import { useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import { useBusiness } from '../context/BusinessContext';
import { useGenerationHistory } from '../hooks/useGenerationHistory';
import { similarity } from '../lib/uniqueness/similarity';
import type { GenerationHistoryEntry } from '../types/models';

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

interface Row {
  entry: GenerationHistoryEntry;
  match?: { text: string; score: number };
}

export default function Fingerprints() {
  const { role } = useBusiness();
  const { entries } = useGenerationHistory(100);

  // For each entry, find the most similar earlier (older) generation.
  const rows = useMemo<Row[]>(() => {
    return entries.map((entry, i) => {
      let best: { text: string; score: number } | undefined;
      for (let j = i + 1; j < entries.length; j++) {
        const score = similarity(entry.text, entries[j].text);
        if (!best || score > best.score) best = { text: entries[j].text, score };
      }
      return { entry, match: best };
    });
  }, [entries]);

  if (role !== 'owner') {
    return (
      <>
        <PageHeader title="Content Fingerprints" />
        <div className="card empty">This admin view is available to owners only.</div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Content Fingerprints"
        subtitle="Similarity, closest prior match, and regeneration counts"
      />
      {rows.length === 0 ? (
        <div className="card empty">No generated content yet. Create some in the Generator.</div>
      ) : (
        <div className="stack">
          {rows.map(({ entry, match }) => (
            <div className="card" key={entry.id}>
              <div className="row between">
                <div className="row" style={{ gap: 6 }}>
                  <span className="badge badge-posted">{entry.generatorType}</span>
                  <span className="tag">{entry.type}</span>
                  {entry.contentCategory && <span className="tag">{entry.contentCategory}</span>}
                </div>
                <span className="muted" style={{ fontSize: '0.78rem' }}>
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </div>

              <p style={{ margin: '10px 0' }}>{entry.text}</p>

              <div className="grid grid-3">
                <Metric label="Uniqueness" value={pct(entry.uniquenessScore)} />
                <Metric label="Brand score" value={pct(entry.brandScore)} />
                <Metric label="Similarity" value={pct(entry.similarityScore)} />
                <Metric label="Regenerations" value={String(entry.regenerationCount)} />
                <Metric label="Fingerprint" value={entry.fingerprint} mono />
              </div>

              {match && (
                <div className="card" style={{ marginTop: 10, background: 'var(--surface-2)' }}>
                  <div className="muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>
                    Closest previous content — {pct(match.score)} similar
                  </div>
                  <div style={{ fontSize: '0.9rem' }}>{match.text}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: '0.74rem' }}>{label}</div>
      <div style={{ fontFamily: mono ? 'monospace' : undefined, fontSize: mono ? '0.78rem' : undefined }}>
        {value}
      </div>
    </div>
  );
}
