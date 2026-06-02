// Phase 7 — Owner Executive Dashboard logic. Pure functions over live JobRecord[]
// (the selected MSOS business). Reuses the Phase-1 KPIs/windows/rollups so there's
// one source of truth. Profit is shown only when MSOS records cost (profitKnown);
// otherwise the UI shows revenue and flags that cost wasn't recorded.
import type { JobRecord } from './types';
import type { VerticalConfig } from '../verticals';
import { jobsKpis, revenueWindows, revenueRollups, serviceKeyword } from './msosWidgets';

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

export interface OwnerSummary {
  revenue: number;
  profit: number;
  profitKnown: boolean;
  marginPct: number | null;
  jobs: number;
  avgTicket: number;
  growthPct: number | null; // this month vs last month (null = no prior-month baseline)
  bestCity: string | null;
  bestService: string | null;
  bestTechnician: string | null;
}

export function ownerSummary(jobs: JobRecord[], now: number): OwnerSummary {
  const k = jobsKpis(jobs);
  const completed = jobs.filter((j) => j.status === 'completed' && j.ticketUsd > 0);
  const cost = sum(completed.map((j) => j.costUsd ?? 0));
  const profitKnown = completed.some((j) => (j.costUsd ?? 0) > 0);
  const profit = k.totalRevenue - cost;
  const w = revenueWindows(jobs, now);
  const growthPct = w.lastMonth.revenue > 0 ? (w.thisMonth.revenue - w.lastMonth.revenue) / w.lastMonth.revenue : null;
  const r = revenueRollups(jobs);
  return {
    revenue: k.totalRevenue,
    profit,
    profitKnown,
    marginPct: profitKnown && k.totalRevenue > 0 ? profit / k.totalRevenue : null,
    jobs: k.completedJobs,
    avgTicket: k.avgTicket,
    growthPct,
    bestCity: r.topCity?.key ?? null,
    bestService: r.topService?.key ?? null,
    bestTechnician: r.topTechnician?.key ?? null,
  };
}

export interface Priority { text: string; to?: string; }

/** Today's Priorities — concrete next actions derived from the live data. */
export function todaysPriorities(jobs: JobRecord[], _vertical: VerticalConfig): Priority[] {
  const r = revenueRollups(jobs);
  const out: Priority[] = [];
  if (r.topCity && r.topService) {
    out.push({ text: `Create 3 ${r.topCity.key} ${serviceKeyword(r.topService.key)} videos`, to: '/new-job' });
  } else if (r.topService) {
    out.push({ text: `Create 3 ${serviceKeyword(r.topService.key)} videos`, to: '/new-job' });
  }
  out.push({ text: 'Post 1 Google Business Profile update', to: '/gbp' });
  out.push({ text: 'Respond to 5 recent reviews', to: '/review' });
  if (r.topCity) out.push({ text: `Target ${r.topCity.key} landing-page ranking`, to: '/seo' });
  if (r.highestLifetimeCustomer) out.push({ text: `Ask ${r.highestLifetimeCustomer.key} for a review + referral`, to: '/review' });
  return out.slice(0, 5);
}
