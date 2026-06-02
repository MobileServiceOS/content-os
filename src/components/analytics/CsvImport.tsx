// CSV import modal. Paste or drop a metrics export; we parse it, show what was
// recognized vs ignored, then upsert via usePostPerformance.importRows.
import { useState } from 'react';
import Modal from '../ui/Modal';
import { parseMetricsCsv } from '../../lib/analytics/ingest';
import type { CsvParseResult, NormalizedRow } from '../../lib/analytics/ingest';

const TEMPLATE =
  'platform,post_url,external_post_id,posted_at,hook_category,service,city,video_length_sec,views,completion_rate,shares,saves,comments,website_clicks,calls,leads,jobs,revenue_usd';

export default function CsvImport({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (rows: NormalizedRow[]) => Promise<{ created: number; updated: number; skipped: number }>;
}) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function onText(v: string) {
    setText(v);
    setParsed(v.trim() ? parseMetricsCsv(v) : null);
  }

  async function onFile(file: File) {
    const content = await file.text();
    onText(content);
  }

  async function doImport() {
    if (!parsed) return;
    setBusy(true);
    try {
      const r = await onImport(parsed.rows);
      setResult(`Imported ${r.created} new, updated ${r.updated}${r.skipped ? `, skipped ${r.skipped} (no platform)` : ''}.`);
    } finally {
      setBusy(false);
    }
  }

  const ready = (parsed?.rows.length ?? 0) > 0;

  return (
    <Modal title="Import metrics CSV" onClose={onClose}>
      {result ? (
        <>
          <p style={{ margin: 0 }}>{result}</p>
          <div className="row between">
            <span />
            <button className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
          </div>
        </>
      ) : (
        <>
          <p className="muted" style={{ margin: 0, fontSize: '0.76rem' }}>
            Paste a CSV (native TikTok / Instagram / YouTube / Meta exports work — we alias common columns), or drop a file.
            Rows match existing posts by post id or URL.
          </p>
          <label
            className="field"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void onFile(f); }}
          >
            <span>CSV content</span>
            <textarea
              className="textarea"
              style={{ minHeight: 140, fontFamily: 'monospace', fontSize: '0.74rem' }}
              value={text}
              placeholder={TEMPLATE}
              onChange={(e) => onText(e.target.value)}
            />
          </label>
          <div className="row" style={{ gap: 8 }}>
            <input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }} />
          </div>

          {parsed && (
            <div className="stack" style={{ gap: 4, fontSize: '0.76rem' }}>
              <div><strong>{parsed.rows.length}</strong> row(s) parsed.</div>
              {parsed.recognizedColumns.length > 0 && (
                <div className="muted">Mapped: {parsed.recognizedColumns.join(', ')}</div>
              )}
              {parsed.unmappedColumns.length > 0 && (
                <div style={{ color: 'var(--warning)' }}>Ignored columns: {parsed.unmappedColumns.join(', ')}</div>
              )}
            </div>
          )}

          <div className="row between">
            <button className="btn btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={() => void doImport()} disabled={!ready || busy}>
              {busy ? 'Importing…' : `Import ${parsed?.rows.length ?? 0} row(s)`}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
