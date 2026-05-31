import type { ContentStatus } from '../../types/models';

const LABELS: Record<ContentStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  scheduled: 'Scheduled',
  posted: 'Posted',
};

export default function StatusBadge({ status }: { status: ContentStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}
