// Manual metric entry for one published post. Owner pastes numbers off the
// platform dashboard; parsing/normalization is shared with the CSV importer.
import { useState } from 'react';
import Modal from '../ui/Modal';
import { parseNumber, parseCompletionRate } from '../../lib/analytics/ingest';
import { POST_PLATFORM_LABELS } from '../../types/analytics';
import type { PostMetrics, PostPerformance } from '../../types/analytics';

const NUM_FIELDS: { key: keyof PostMetrics; label: string }[] = [
  { key: 'views', label: 'Views' },
  { key: 'watchTimeSec', label: 'Total watch time (sec)' },
  { key: 'avgViewDurationSec', label: 'Avg view duration (sec)' },
  { key: 'shares', label: 'Shares' },
  { key: 'saves', label: 'Saves' },
  { key: 'comments', label: 'Comments' },
  { key: 'profileVisits', label: 'Profile visits' },
  { key: 'websiteClicks', label: 'Website clicks' },
  { key: 'calls', label: 'Calls' },
  { key: 'directionRequests', label: 'Direction requests' },
  { key: 'leads', label: 'Leads' },
  { key: 'jobs', label: 'Jobs booked' },
  { key: 'revenueUsd', label: 'Revenue (USD)' },
];

export default function MetricsForm({
  row,
  onClose,
  onSave,
}: {
  row: PostPerformance;
  onClose: () => void;
  onSave: (metrics: PostMetrics) => Promise<void> | void;
}) {
  const seed: Record<string, string> = { completionRate: String(Math.round(row.metrics.completionRate * 100)) };
  NUM_FIELDS.forEach((f) => { seed[f.key] = String(row.metrics[f.key] || ''); });
  const [vals, setVals] = useState<Record<string, string>>(seed);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));

  async function handleSave() {
    setSaving(true);
    const metrics = { ...row.metrics } as PostMetrics;
    NUM_FIELDS.forEach((f) => { metrics[f.key] = parseNumber(vals[f.key]); });
    metrics.completionRate = parseCompletionRate(vals.completionRate);
    try {
      await onSave(metrics);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Metrics — ${POST_PLATFORM_LABELS[row.platform]}`} onClose={onClose}>
      <p className="muted" style={{ margin: 0, fontSize: '0.76rem' }}>
        {row.hookText ? `“${row.hookText.slice(0, 60)}”` : row.postUrl ?? 'Enter the numbers from the platform dashboard.'}
      </p>
      <label className="field">
        <span>Completion rate (%)</span>
        <input className="input" inputMode="decimal" value={vals.completionRate} onChange={(e) => set('completionRate', e.target.value)} placeholder="e.g. 61" />
      </label>
      <div className="grid grid-2">
        {NUM_FIELDS.map((f) => (
          <label key={f.key} className="field">
            <span>{f.label}</span>
            <input className="input" inputMode="decimal" value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder="0" />
          </label>
        ))}
      </div>
      <div className="row between">
        <button className="btn btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving…' : 'Save metrics'}
        </button>
      </div>
    </Modal>
  );
}
