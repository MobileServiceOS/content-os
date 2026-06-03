// Content Calendar: day/week/month views, drag-and-drop scheduling, status
// tracking. Drag an unscheduled item from the tray onto a day to schedule it, or
// drag a scheduled chip to another day to reschedule. No live posting.
import { useState, type DragEvent } from 'react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import { useBusiness } from '../context/BusinessContext';
import { useCalendarItems } from '../hooks/useCalendarItems';
import { useContentItems } from '../hooks/useContentItems';
import { can } from '../lib/permissions';
import {
  WEEKDAYS, monthGrid, weekGrid, dayNum, isSameMonth, isToday, noon, sameDay,
  addMonths, addDays, fmtMonth, fmtRangeWeek, fmtDayLong,
} from '../lib/date';
import type { CalendarItem, ContentStatus } from '../types/models';

type View = 'month' | 'week' | 'day';
interface Payload { kind: 'cal' | 'content'; id: string; title?: string; status?: ContentStatus }

export default function Calendar({ embedded = false }: { embedded?: boolean } = {}) {
  const { role } = useBusiness();
  const editable = can('calendar.edit', role);
  const { items, create, remove, reschedule, setStatus } = useCalendarItems();
  const { items: content } = useContentItems();

  const [view, setView] = useState<View>('month');
  const [anchor, setAnchor] = useState(() => Date.now());

  const scheduledContentIds = new Set(items.map((i) => i.contentItemId));
  const unscheduled = content.filter((c) => !c.archived && !scheduledContentIds.has(c.id));
  const dayItems = (ms: number): CalendarItem[] => items.filter((i) => sameDay(i.scheduledAt, ms));

  function move(dir: number) {
    if (view === 'month') setAnchor((a) => addMonths(a, dir));
    else if (view === 'week') setAnchor((a) => addDays(a, dir * 7));
    else setAnchor((a) => addDays(a, dir));
  }

  function onDrop(e: DragEvent, dayMs: number) {
    e.preventDefault();
    if (!editable) return;
    try {
      const p: Payload = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (p.kind === 'cal') void reschedule(p.id, noon(dayMs));
      else void create({ contentItemId: p.id, title: p.title ?? 'Untitled', scheduledAt: noon(dayMs), status: p.status ?? 'scheduled' });
    } catch {
      /* ignore malformed drops */
    }
  }

  const dragProps = (payload: Payload) =>
    editable
      ? {
          draggable: true,
          onDragStart: (e: DragEvent) => e.dataTransfer.setData('text/plain', JSON.stringify(payload)),
        }
      : {};

  function Chip({ item }: { item: CalendarItem }) {
    return (
      <div className="tag" style={{ display: 'flex', gap: 4, alignItems: 'center', cursor: editable ? 'grab' : 'default', maxWidth: '100%' }}
        {...dragProps({ kind: 'cal', id: item.id })}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
        {editable && <button className="btn btn-sm" style={{ minHeight: 18, padding: '0 4px' }} onClick={() => void remove(item.id)}>✕</button>}
      </div>
    );
  }

  function DayCell({ ms, compact }: { ms: number; compact?: boolean }) {
    const list = dayItems(ms);
    return (
      <div
        onDragOver={(e) => editable && e.preventDefault()}
        onDrop={(e) => onDrop(e, ms)}
        style={{
          border: '1px solid var(--border)', borderRadius: 8, padding: 6, minHeight: compact ? 84 : 120,
          background: isToday(ms) ? 'var(--surface-2)' : 'var(--surface)',
          opacity: compact && !isSameMonth(ms, anchor) ? 0.45 : 1,
        }}
      >
        <div className="muted" style={{ fontSize: '0.72rem', marginBottom: 4 }}>{dayNum(ms)}</div>
        <div className="stack" style={{ gap: 4 }}>
          {list.slice(0, compact ? 3 : 20).map((i) => <Chip key={i.id} item={i} />)}
          {compact && list.length > 3 && <span className="muted" style={{ fontSize: '0.7rem' }}>+{list.length - 3} more</span>}
        </div>
      </div>
    );
  }

  const label = view === 'month' ? fmtMonth(anchor) : view === 'week' ? fmtRangeWeek(anchor) : fmtDayLong(anchor);

  return (
    <>
      {!embedded && <PageHeader title="Content Calendar" subtitle="Plan & schedule — drag to reschedule" />}

      <div className="card stack">
        <div className="row between">
          <div className="row">
            {(['day', 'week', 'month'] as View[]).map((v) => (
              <button key={v} className={`btn btn-sm ${view === v ? 'btn-primary' : ''}`} onClick={() => setView(v)}>
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <div className="row">
            <button className="btn btn-sm" onClick={() => move(-1)}>‹</button>
            <button className="btn btn-sm" onClick={() => setAnchor(Date.now())}>Today</button>
            <button className="btn btn-sm" onClick={() => move(1)}>›</button>
          </div>
        </div>
        <strong>{label}</strong>

        {view === 'month' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {WEEKDAYS.map((d) => <div key={d} className="muted" style={{ fontSize: '0.72rem', textAlign: 'center' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {monthGrid(anchor).map((ms) => <DayCell key={ms} ms={ms} compact />)}
            </div>
          </>
        )}

        {view === 'week' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {weekGrid(anchor).map((ms) => (
              <div key={ms} className="stack" style={{ gap: 4 }}>
                <div className="muted" style={{ fontSize: '0.72rem', textAlign: 'center' }}>{WEEKDAYS[new Date(ms).getDay()]}</div>
                <DayCell ms={ms} />
              </div>
            ))}
          </div>
        )}

        {view === 'day' && (
          <div className="stack">
            <div onDragOver={(e) => editable && e.preventDefault()} onDrop={(e) => onDrop(e, anchor)} className="card" style={{ background: 'var(--surface-2)', minHeight: 120 }}>
              {dayItems(anchor).length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>Nothing scheduled. Drag content here to schedule it.</p>
              ) : (
                <div className="stack">
                  {dayItems(anchor).map((i) => (
                    <div key={i.id} className="row between">
                      <div className="row" style={{ gap: 8 }}>
                        <span {...dragProps({ kind: 'cal', id: i.id })} style={{ cursor: editable ? 'grab' : 'default' }}>{i.title}</span>
                        <StatusBadge status={i.status} />
                      </div>
                      {editable && (
                        <div className="row">
                          <select className="select" style={{ width: 'auto' }} value={i.status} onChange={(e) => void setStatus(i.id, e.target.value as ContentStatus)}>
                            {(['draft', 'approved', 'scheduled', 'posted'] as ContentStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button className="btn btn-sm btn-danger" onClick={() => void remove(i.id)}>Remove</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {editable && (
        <div className="card stack" style={{ marginTop: 16 }}>
          <div className="row between">
            <h2 style={{ margin: 0 }}>Unscheduled content</h2>
            <span className="muted" style={{ fontSize: '0.8rem' }}>Drag onto a day</span>
          </div>
          {unscheduled.length === 0 ? (
            <p className="muted">All content is scheduled. Generate more or check the library.</p>
          ) : (
            <div className="row" style={{ gap: 6 }}>
              {unscheduled.slice(0, 30).map((c) => (
                <div key={c.id} className="tag" style={{ cursor: 'grab', display: 'flex', gap: 6, alignItems: 'center' }}
                  {...dragProps({ kind: 'content', id: c.id, title: c.title, status: c.status })}>
                  {c.title}
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
