// Content Library: search, filter, status management, edit/duplicate/delete/archive.
import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import CopyButton from '../components/ui/CopyButton';
import Modal from '../components/ui/Modal';
import RoleGate from '../components/RoleGate';
import { TextField, TextArea, SelectField } from '../components/ui/Field';
import { useContentItems } from '../hooks/useContentItems';
import { usePostPerformance } from '../hooks/usePostPerformance';
import { PLATFORM_LABELS } from '../types/generation';
import { POST_PLATFORM_LABELS } from '../types/analytics';
import type { PostPlatform } from '../types/analytics';
import type { ContentItem, ContentStatus } from '../types/models';

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'posted', label: 'Posted' },
];

const STATUS_COLOR: Record<ContentStatus, string> = {
  draft: 'var(--text-dim)', approved: 'var(--c-emerald)', scheduled: 'var(--c-amber)', posted: 'var(--c-blue)',
};

export default function Library({ embedded = false }: { embedded?: boolean } = {}) {
  const { items, loading, update, remove, duplicate, setStatus, archive } = useContentItems();
  const { linkFromContentItem } = usePostPerformance();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all');
  const [platformFilter, setPlatformFilter] = useState<'all' | string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [tracking, setTracking] = useState<ContentItem | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((i) => {
      if (!showArchived && i.archived) return false;
      if (showArchived && !i.archived) return false;
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (platformFilter !== 'all' && i.platform !== platformFilter) return false;
      if (q && !(`${i.title} ${i.content} ${i.tags.join(' ')}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [items, search, statusFilter, platformFilter, showArchived]);

  return (
    <>
      {!embedded && <PageHeader title="Content Library" subtitle={`${items.filter((i) => !i.archived).length} items`} />}

      <div className="card stack">
        <TextField label="Search" value={search} onChange={setSearch} placeholder="Search title, content, tags" />
        <div className="grid grid-3">
          <SelectField
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as 'all' | ContentStatus)}
            options={[{ value: 'all', label: 'All statuses' }, ...STATUS_OPTIONS]}
          />
          <SelectField
            label="Platform"
            value={platformFilter}
            onChange={setPlatformFilter}
            options={[{ value: 'all', label: 'All platforms' }, ...Object.entries(PLATFORM_LABELS).map(([value, label]) => ({ value, label }))]}
          />
          <label className="field">
            <span>View</span>
            <button className="btn" onClick={() => setShowArchived((s) => !s)}>
              {showArchived ? 'Showing archived' : 'Showing active'}
            </button>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="card empty">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card empty">No content matches. Generate some in the Generator.</div>
      ) : (
        <div className="stack" style={{ marginTop: 16 }}>
          {filtered.map((item) => (
            <div key={item.id} className="card stack tile" style={{ ['--accent' as string]: STATUS_COLOR[item.status] }}>
              <div className="row between">
                <strong>{item.title}</strong>
                <StatusBadge status={item.status} />
              </div>
              <div className="muted" style={{ fontSize: '0.78rem' }}>
                {item.platform}{item.city ? ` · ${item.city}` : ''}{item.service ? ` · ${item.service}` : ''}
              </div>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{item.content}</p>
              {item.tags.length > 0 && (
                <div className="row" style={{ gap: 4 }}>
                  {item.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                </div>
              )}
              <div className="row">
                <CopyButton text={item.content} />
                <RoleGate action="content.edit">
                  <button className="btn btn-sm" onClick={() => setEditing(item)}>Edit</button>
                  <button className="btn btn-sm" onClick={() => void duplicate(item)}>Duplicate</button>
                  <select
                    className="select"
                    style={{ width: 'auto' }}
                    value={item.status}
                    onChange={(e) => void setStatus(item.id, e.target.value as ContentStatus)}
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <button className="btn btn-sm" onClick={() => void archive(item.id, !item.archived)}>
                    {item.archived ? 'Unarchive' : 'Archive'}
                  </button>
                  <button className="btn btn-sm" onClick={() => setTracking(item)} title="Track this post's performance">📈 Track</button>
                </RoleGate>
                <RoleGate action="content.delete">
                  <button className="btn btn-sm btn-danger" onClick={() => void remove(item.id)}>Delete</button>
                </RoleGate>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditModal item={editing} onClose={() => setEditing(null)} onSave={(patch) => { void update(editing.id, patch); setEditing(null); }} />
      )}
      {tracking && (
        <TrackModal
          item={tracking}
          onClose={() => setTracking(null)}
          onTrack={async (platform, postUrl) => {
            if (tracking.status !== 'posted') await setStatus(tracking.id, 'posted');
            await linkFromContentItem(tracking, { platform, postUrl: postUrl || undefined });
            setTracking(null);
          }}
        />
      )}
    </>
  );
}

const PLATFORM_TO_POST: Record<string, PostPlatform> = {
  tiktok: 'tiktok', instagram: 'instagram', facebook: 'facebook', youtube_shorts: 'youtube_shorts',
};

function TrackModal({
  item,
  onClose,
  onTrack,
}: {
  item: ContentItem;
  onClose: () => void;
  onTrack: (platform: PostPlatform, postUrl: string) => Promise<void>;
}) {
  const [platform, setPlatform] = useState<PostPlatform>(PLATFORM_TO_POST[item.platform] ?? 'tiktok');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Modal title="Track performance" onClose={onClose}>
      <p className="muted" style={{ margin: 0, fontSize: '0.78rem' }}>
        Creates a performance row for “{item.title}”. Add the live numbers in Analytics afterward.
        {item.status !== 'posted' && ' This will also mark the item as posted.'}
      </p>
      <SelectField
        label="Platform"
        value={platform}
        onChange={(v) => setPlatform(v as PostPlatform)}
        options={(Object.keys(POST_PLATFORM_LABELS) as PostPlatform[]).map((value) => ({ value, label: POST_PLATFORM_LABELS[value] }))}
      />
      <TextField label="Post URL (optional)" value={url} onChange={setUrl} placeholder="https://…" />
      <button
        className="btn btn-primary btn-block"
        disabled={busy}
        onClick={async () => { setBusy(true); try { await onTrack(platform, url); } finally { setBusy(false); } }}
      >
        {busy ? 'Adding…' : 'Start tracking'}
      </button>
    </Modal>
  );
}

function EditModal({
  item,
  onClose,
  onSave,
}: {
  item: ContentItem;
  onClose: () => void;
  onSave: (patch: Partial<ContentItem>) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content);
  const [notes, setNotes] = useState(item.notes);
  const [tags, setTags] = useState(item.tags.join(', '));

  return (
    <Modal title="Edit content" onClose={onClose}>
      <TextField label="Title" value={title} onChange={setTitle} />
      <TextArea label="Content" value={content} onChange={setContent} />
      <TextField label="Tags (comma-separated)" value={tags} onChange={setTags} />
      <TextArea label="Notes" value={notes} onChange={setNotes} />
      <button
        className="btn btn-primary btn-block"
        onClick={() => onSave({ title, content, notes, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) })}
      >
        Save changes
      </button>
    </Modal>
  );
}
