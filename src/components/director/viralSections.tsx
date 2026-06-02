// Phase 2 — Viral Content Engine UI. Reads the SAME live MSOS jobs (selected
// business) and renders three Top-10 idea lists with 4 scores each. One click
// expands the full 11-part content package with copy buttons. No mock data:
// shows a connect prompt until MSOS is connected in the Revenue Intel tab.
import { useState } from 'react';
import { useMsosJobs } from '../../hooks/useMsosJobs';
import { viralIdeas, type ContentPackage } from '../../lib/director/viralEngine';
import { SectionTitle, ScoreChip, accentAt } from './shared';

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); });
  };
  return (
    <div className="stack" style={{ gap: 3 }}>
      <div className="row between">
        <span className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <button className="btn btn-sm" style={{ padding: '1px 7px', minHeight: 0, fontSize: '0.68rem' }} onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
      </div>
      <div style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  );
}

function IdeaCard({ pkg, accent }: { pkg: ContentPackage; accent: string }) {
  const [open, setOpen] = useState(false);
  const s = pkg.scores;
  return (
    <div className="card stack" style={{ gap: 8, ['--accent' as string]: accent }}>
      <div className="row between" style={{ alignItems: 'flex-start', gap: 8 }}>
        <strong style={{ fontSize: '0.92rem' }}>{pkg.title}</strong>
        <ScoreChip value={s.overall} label="Overall" />
      </div>
      <p style={{ margin: 0, fontSize: '0.86rem' }}>“{pkg.hook}”</p>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <ScoreChip value={s.virality} label="Viral" />
        <ScoreChip value={s.revenue} label="Revenue" />
        <ScoreChip value={s.seo} label="SEO" />
        <ScoreChip value={s.reviewGen} label="Reviews" />
      </div>
      <button className="btn btn-sm btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide package' : 'Generate Content Package →'}
      </button>
      {open && (
        <div className="stack" style={{ gap: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <CopyRow label="Hook" value={pkg.hook} />
          <CopyRow label="Video Concept" value={pkg.videoConcept} />
          <CopyRow label="Avatar Script" value={pkg.avatarScript} />
          <CopyRow label="TikTok Caption" value={pkg.tiktokCaption} />
          <CopyRow label="Instagram Caption" value={pkg.instagramCaption} />
          <CopyRow label="Facebook Caption" value={pkg.facebookCaption} />
          <CopyRow label="YouTube Shorts Title" value={pkg.youtubeTitle} />
          <CopyRow label="YouTube Description" value={pkg.youtubeDescription} />
          <CopyRow label="GBP Post" value={pkg.gbpPost} />
          <CopyRow label="SEO Keywords" value={pkg.seoKeywords.join(', ')} />
          <CopyRow label="Hashtags" value={pkg.hashtags.join(' ')} />
        </div>
      )}
    </div>
  );
}

function IdeaList({ title, accent, ideas }: { title: string; accent: string; ideas: ContentPackage[] }) {
  return (
    <div className="card stack">
      <SectionTitle accent={accent}>{title}</SectionTitle>
      <div className="stack" style={{ gap: 10 }}>
        {ideas.map((p, i) => <IdeaCard key={p.id + i} pkg={p} accent={accentAt(i)} />)}
      </div>
    </div>
  );
}

export function ViralEngine() {
  const { jobs, loading, needsConnect, vertical, businesses, selectedBusinessId } = useMsosJobs();

  if (needsConnect) {
    return <div className="card"><p className="muted" style={{ margin: 0, fontSize: '0.86rem' }}>Connect MSOS in the <strong>Revenue Intel (MSOS)</strong> tab — the Viral Engine builds ideas from your live revenue data.</p></div>;
  }
  if (loading) return <div className="card"><p className="muted" style={{ margin: 0 }}>Building ideas from your live data…</p></div>;
  if (jobs.length === 0) return <div className="card"><p className="muted" style={{ margin: 0 }}>No jobs to learn from yet for this business.</p></div>;

  const businessName = businesses.find((b) => b.id === selectedBusinessId)?.name ?? 'Your business';
  const ideas = viralIdeas(jobs, { businessName, vertical });

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card" style={{ padding: '10px 12px' }}>
        <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
          Ideas generated from <strong>{businessName}</strong>'s live revenue data (top cities, services, {vertical.productDimension.label.toLowerCase()}) — scored on Virality / Revenue / SEO / Review-generation. Click any idea for the full 11-part package.
        </p>
      </div>
      <IdeaList title="🔥 Top 10 Ideas Today" accent="var(--c-orange)" ideas={ideas.topToday} />
      <IdeaList title="📅 Top 10 Ideas This Week" accent="var(--c-violet)" ideas={ideas.topThisWeek} />
      <IdeaList title="💰 Top 10 Revenue Opportunities" accent="var(--c-emerald)" ideas={ideas.topRevenueOpportunities} />
    </div>
  );
}
