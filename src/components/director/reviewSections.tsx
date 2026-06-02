// Phase 4 — Review Intelligence UI. The owner pastes their REAL reviews (stored
// locally — no Firestore/rules change, nothing invented). We analyze themes +
// most-mentioned city/service/technician (using the connected business's vocab)
// and surface response / GBP / video / SEO opportunities. Works with or without
// MSOS connected (vocab comes from live jobs when available).
import { useMemo, useState } from 'react';
import { useMsosJobs } from '../../hooks/useMsosJobs';
import {
  parseReviews, analyzeReviews, reviewOpportunities, type ReviewVocab,
} from '../../lib/director/reviewIntel';
import { SectionTitle } from './shared';

const STORE_KEY = 'reviewIntel.text';
const uniq = (xs: string[]): string[] => [...new Set(xs.filter(Boolean))];

function Tile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="card tile" style={{ ['--accent' as string]: accent }}>
      <div className="muted" style={{ fontSize: '0.74rem' }}>{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function ThemeList({ title, accent, items }: { title: string; accent: string; items: { label: string; count: number; example?: string }[] }) {
  return (
    <div className="card stack">
      <SectionTitle accent={accent}>{title}</SectionTitle>
      {items.length === 0 ? <p className="muted" style={{ margin: 0, fontSize: '0.84rem' }}>None detected.</p> : items.map((t) => (
        <div key={t.label} className="row between" style={{ alignItems: 'flex-start', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: '0.86rem' }}>{t.label}</strong>
            {t.example && <div className="muted" style={{ fontSize: '0.74rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>“{t.example}”</div>}
          </div>
          <span className="tag" style={{ fontSize: '0.68rem', flex: '0 0 auto' }}>{t.count}×</span>
        </div>
      ))}
    </div>
  );
}

function OppList({ title, accent, items }: { title: string; accent: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="card stack">
      <SectionTitle accent={accent}>{title}</SectionTitle>
      <ul style={{ margin: 0, paddingLeft: 18 }}>{items.map((s, i) => <li key={i} style={{ fontSize: '0.84rem', marginBottom: 5 }}>{s}</li>)}</ul>
    </div>
  );
}

export function ReviewIntel() {
  const { jobs } = useMsosJobs();
  const [text, setText] = useState<string>(() => (typeof localStorage !== 'undefined' ? localStorage.getItem(STORE_KEY) ?? '' : ''));

  const vocab: ReviewVocab = useMemo(() => ({
    cities: uniq(jobs.map((j) => j.city)),
    services: uniq(jobs.map((j) => j.service)),
    technicians: uniq(jobs.map((j) => j.technician).filter((t) => t && t !== 'Unassigned')),
  }), [jobs]);

  const reviews = useMemo(() => parseReviews(text), [text]);
  const analysis = useMemo(() => analyzeReviews(reviews, vocab), [reviews, vocab]);
  const opps = useMemo(() => reviewOpportunities(analysis, vocab), [analysis, vocab]);

  const onChange = (v: string) => {
    setText(v);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORE_KEY, v);
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card stack">
        <SectionTitle accent="var(--c-amber)">Paste your reviews</SectionTitle>
        <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
          One review per line. Optional leading rating, e.g. <code>5 - Showed up in 20 minutes, lifesaver!</code>
          Your reviews stay in this browser (no live GBP feed yet — that arrives in Phase 8).
        </p>
        <textarea
          className="textarea" rows={6} value={text} onChange={(e) => onChange(e.target.value)}
          placeholder={'5 - Came to my driveway in Hollywood, fast and professional.\n4 - A bit pricey but worth it at night.\n3 - Took longer than the quoted window.'}
        />
        <span className="muted" style={{ fontSize: '0.74rem' }}>{reviews.length} review{reviews.length === 1 ? '' : 's'} parsed{vocab.cities.length ? '' : ' · connect MSOS for city/service/technician detection'}</span>
      </div>

      {reviews.length === 0 ? null : (
        <>
          <div className="grid grid-3">
            <Tile label="Reviews" value={String(analysis.count)} accent="var(--c-blue)" />
            <Tile label="Avg rating" value={analysis.avgRating != null ? `${analysis.avgRating.toFixed(1)}★` : '—'} accent="var(--c-amber)" />
            <Tile label="Praise themes" value={String(analysis.praise.length)} accent="var(--c-emerald)" />
            <Tile label="Complaint themes" value={String(analysis.complaints.length)} accent="var(--danger)" />
            <Tile label="Top city" value={analysis.topCity?.name ?? '—'} accent="var(--c-cyan)" />
            <Tile label="Top service" value={analysis.topService?.name ?? '—'} accent="var(--c-violet)" />
          </div>

          <div className="grid grid-2">
            <ThemeList title="Most common praise" accent="var(--c-emerald)" items={analysis.praise} />
            <ThemeList title="Most common complaints" accent="var(--danger)" items={analysis.complaints} />
          </div>

          <div className="grid grid-2">
            <OppList title="Review response suggestions" accent="var(--c-blue)" items={opps.responses} />
            <OppList title="GBP post opportunities" accent="var(--c-cyan)" items={opps.gbpPosts} />
            <OppList title="Video opportunities" accent="var(--c-pink)" items={opps.videos} />
            <OppList title="SEO opportunities" accent="var(--c-orange)" items={opps.seo} />
          </div>
        </>
      )}
    </div>
  );
}
