// Level 3 (Business Agent OS) document models for the new collections.
import type { Audit, ContentStatus, ApprovalState } from './models';

/** Master Content Asset — one completed job, the single source for all content. */
export interface MasterContentAsset extends Audit {
  id: string;
  service: string;
  vehicle: string;
  tireSize: string;
  city: string;
  timeOfDay?: string;
  responseTime?: string;
  completionTime?: string;
  notes?: string;
  story: string; // generated narrative
  contentAngle: string;
  hookCategory: string;
  entityData: string[]; // vehicle / tire / local entities
  photoRefs: string[]; // mediaItem ids or storage paths
  status: ContentStatus;
}

/** Google Business Profile post — compliant: NO CTA in description; links separate. */
export interface GbpPost extends Audit {
  id: string;
  assetId?: string;
  description: string;
  websiteUrl: string;
  reviewUrl: string;
  hashtags: string[];
  approvalState: ApprovalState;
  status: ContentStatus;
}

export type SeoContentType = 'service_page' | 'city_page' | 'faq' | 'ai_search' | 'entity';

export interface SeoContent extends Audit {
  id: string;
  type: SeoContentType;
  title: string;
  body: string;
  entities: string[];
  questions: string[];
  city?: string;
  service?: string;
  approvalState: ApprovalState;
}

export type TaskCategory = 'seo' | 'gbp' | 'review' | 'content';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'done';

export interface TaskItem extends Audit {
  id: string;
  category: TaskCategory;
  title: string;
  detail?: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdByAgent?: string;
}

export type AgentAction =
  | 'generated'
  | 'approved'
  | 'rejected'
  | 'created_task'
  | 'distributed'
  | 'optimized';

/** Append-only activity log powering the Agent Activity Feed. */
export interface AgentLog extends Audit {
  id: string;
  agent: string;
  action: AgentAction;
  summary: string;
  refId?: string; // doc this log refers to
  refKind?: string; // collection name
}
