// The 10 MSOS-jobs Director widgets — pure analyzers over real JobRecord[]
// (read from MSOS). Revenue widgets use COMPLETED jobs only (realized revenue);
// pending jobs are surfaced as pipeline. No mock data: callers pass the live
// array, and the UI renders a connect-state when there's nothing to read.
import type { JobRecord } from './types';

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const completedOnly = (jobs: JobRecord[]): JobRecord[] => jobs.filter((j) => j.status === 'completed' && j.ticketUsd > 0);

export interface JobsKpis {
  totalRevenue: number;
  completedJobs: number;
  pendingJobs: number;
  avgTicket: number;
  pendingPipelineUsd: number;
}

export function jobsKpis(jobs: JobRecord[]): JobsKpis {
  const done = completedOnly(jobs);
  const pending = jobs.filter((j) => j.status === 'pending');
  const totalRevenue = sum(done.map((j) => j.ticketUsd));
  return {
    totalRevenue,
    completedJobs: done.length,
    pendingJobs: pending.length,
    avgTicket: done.length ? totalRevenue / done.length : 0,
    pendingPipelineUsd: sum(pending.map((j) => j.ticketUsd)),
  };
}

export interface RevGroup {
  key: string;
  jobs: number;
  revenue: number;
  avgTicket: number;
  share: number; // 0..1 of total completed revenue
}

/** Generic revenue group-by over completed jobs, sorted by revenue desc. */
function revenueBy(jobs: JobRecord[], keyOf: (j: JobRecord) => string): RevGroup[] {
  const done = completedOnly(jobs);
  const total = sum(done.map((j) => j.ticketUsd)) || 1;
  const m = new Map<string, JobRecord[]>();
  for (const j of done) {
    const k = keyOf(j) || 'Unknown';
    (m.get(k) ?? m.set(k, []).get(k)!).push(j);
  }
  return [...m.entries()]
    .map(([key, js]) => {
      const revenue = sum(js.map((j) => j.ticketUsd));
      return { key, jobs: js.length, revenue, avgTicket: revenue / js.length, share: revenue / total };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

// 1–4: revenue dimensions
export const revenueByCity = (jobs: JobRecord[]): RevGroup[] => revenueBy(jobs, (j) => j.city);
export const revenueByService = (jobs: JobRecord[]): RevGroup[] => revenueBy(jobs, (j) => j.service);
export const revenueByTechnician = (jobs: JobRecord[]): RevGroup[] => revenueBy(jobs, (j) => j.technician);
export const revenueByTireSize = (jobs: JobRecord[]): RevGroup[] => revenueBy(jobs, (j) => j.tireSize);

// 5: top customers
export const topCustomers = (jobs: JobRecord[], limit = 10): RevGroup[] => revenueBy(jobs, (j) => j.customer).slice(0, limit);

// 6: daily revenue trend (last 30 days ending at the latest completed job)
export interface TrendPt { label: string; value: number; }
const DAY = 86_400_000;

export function dailyRevenueTrend(jobs: JobRecord[], days = 30): TrendPt[] {
  const done = completedOnly(jobs).filter((j) => j.completedAt > 0);
  if (!done.length) return [];
  const end = Math.max(...done.map((j) => j.completedAt));
  const start = end - (days - 1) * DAY;
  const buckets = new Array(days).fill(0);
  for (const j of done) {
    if (j.completedAt < start) continue;
    const idx = Math.min(days - 1, Math.floor((j.completedAt - start) / DAY));
    buckets[idx] += j.ticketUsd;
  }
  return buckets.map((v, i) => ({ label: mdLabel(start + i * DAY), value: v }));
}

// 7: monthly revenue trend (chronological)
export function monthlyRevenueTrend(jobs: JobRecord[]): TrendPt[] {
  const done = completedOnly(jobs).filter((j) => j.completedAt > 0);
  const m = new Map<string, number>();
  for (const j of done) {
    const d = new Date(j.completedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    m.set(key, (m.get(key) ?? 0) + j.ticketUsd);
  }
  return [...m.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, value]) => ({ label: monthLabel(key), value }));
}

// 8: service heat map (service x city revenue matrix)
export interface HeatMap {
  cities: string[];
  rows: { service: string; total: number; cells: number[] }[];
  max: number;
}

export function serviceHeatMap(jobs: JobRecord[], topServices = 8, topCities = 8): HeatMap {
  const done = completedOnly(jobs);
  const cities = revenueByCity(jobs).slice(0, topCities).map((g) => g.key);
  const services = revenueByService(jobs).slice(0, topServices).map((g) => g.key);
  const cityIdx = new Map(cities.map((c, i) => [c, i]));
  let max = 0;
  const rows = services.map((service) => {
    const cells = new Array(cities.length).fill(0);
    for (const j of done) {
      if (j.service !== service) continue;
      const ci = cityIdx.get(j.city);
      if (ci === undefined) continue;
      cells[ci] += j.ticketUsd;
      if (cells[ci] > max) max = cells[ci];
    }
    return { service, total: sum(cells), cells };
  });
  return { cities, rows, max: max || 1 };
}

// 9: revenue opportunity report (the example-style insight strings)
export interface OpportunityReport {
  insights: string[];
  pendingPipelineUsd: number;
}

export function revenueOpportunity(jobs: JobRecord[]): OpportunityReport {
  const insights: string[] = [];
  const services = revenueByService(jobs);
  const cities = revenueByCity(jobs);
  const tires = revenueByTireSize(jobs);
  const techs = revenueByTechnician(jobs);

  if (services[0]) {
    insights.push(`${services[0].key} generated ${pctStr(services[0].share)} of revenue.`);
  }
  if (cities.length >= 2) {
    const top = cities[0];
    const bottom = [...cities].reverse().find((c) => c.revenue > 0);
    if (bottom && bottom.key !== top.key && bottom.revenue > 0) {
      insights.push(`${top.key} generated ${ratioStr(top.revenue / bottom.revenue)} more revenue than ${bottom.key}.`);
    }
  }
  if (tires[0] && tires[0].key !== 'Unknown') {
    insights.push(`${tires[0].key} is the highest revenue tire size.`);
  }
  if (techs[0] && techs.length >= 2) {
    insights.push(`${techs[0].key} is your top-earning technician (${pctStr(techs[0].share)} of revenue).`);
  }
  const kpis = jobsKpis(jobs);
  if (kpis.pendingPipelineUsd > 0) {
    insights.push(`${money(kpis.pendingPipelineUsd)} sits in ${kpis.pendingJobs} pending jobs — close them to realize it.`);
  }
  // Underserved high-value service: a service with high avg ticket but few jobs.
  const scalable = [...services].filter((s) => s.jobs >= 1).sort((a, b) => b.avgTicket - a.avgTicket)[0];
  if (scalable && services[0] && scalable.key !== services[0].key) {
    insights.push(`${scalable.key} has your highest avg ticket (${money(scalable.avgTicket)}) — more volume here lifts margin fastest.`);
  }
  return { insights, pendingPipelineUsd: kpis.pendingPipelineUsd };
}

// 10: recommended content report
export interface ContentRec { title: string; rationale: string; to?: string; }

const STOP = new Set(['mobile', 'tire', 'service', 'installation', 'starts', 'a']);
/** "Mobile Tire Replacement" -> "replacement"; "Emergency Tire Service" -> "emergency". */
export function serviceKeyword(service: string): string {
  const words = service.toLowerCase().split(/\s+/).filter((w) => w && !STOP.has(w));
  return words[words.length - 1] || service.toLowerCase();
}

export function recommendedContent(jobs: JobRecord[]): ContentRec[] {
  const services = revenueByService(jobs);
  const cities = revenueByCity(jobs);
  const recs: ContentRec[] = [];

  if (services[0]) {
    recs.push({
      title: `Create more ${serviceKeyword(services[0].key)} content.`,
      rationale: `${services[0].key} is your #1 revenue service (${pctStr(services[0].share)} of revenue, ${money(services[0].avgTicket)} avg ticket). Lead with it.`,
      to: '/new-job',
    });
  }
  cities.slice(0, 2).forEach((c) => {
    recs.push({
      title: `Create more ${c.key} content.`,
      rationale: `${c.key} drove ${money(c.revenue)} across ${c.jobs} jobs — geo-target content there to compound demand.`,
      to: '/gbp',
    });
  });
  // Vehicle-rich tire size angle.
  const tires = revenueByTireSize(jobs);
  if (tires[0] && tires[0].key !== 'Unknown') {
    recs.push({
      title: `Show ${tires[0].key} jobs on camera.`,
      rationale: `${tires[0].key} is your top revenue tire size — real install footage converts that exact buyer.`,
      to: '/script',
    });
  }
  return recs;
}

// === Phase 1: Revenue Intelligence additions ===

// Generic revenue group-by on any JobRecord field (drives the vertical's product dimension).
export const revenueByVehicle = (jobs: JobRecord[]): RevGroup[] => revenueBy(jobs, (j) => j.vehicle);
export const revenueByField = (jobs: JobRecord[], field: keyof JobRecord): RevGroup[] =>
  revenueBy(jobs, (j) => String(j[field] ?? 'Unknown'));

/** New vs Returning, by how many completed jobs share a customer name. */
export function revenueByCustomerType(jobs: JobRecord[]): RevGroup[] {
  const freq = new Map<string, number>();
  for (const j of completedOnly(jobs)) freq.set(j.customer, (freq.get(j.customer) ?? 0) + 1);
  return revenueBy(jobs, (j) => ((freq.get(j.customer) ?? 0) > 1 ? 'Returning' : 'New'));
}

// --- time-window revenue ---
export interface WindowRevenue { label: string; revenue: number; jobs: number; }
export interface RevenueWindows {
  today: WindowRevenue; yesterday: WindowRevenue; thisWeek: WindowRevenue;
  thisMonth: WindowRevenue; lastMonth: WindowRevenue; last90: WindowRevenue;
}
const startOfDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const startOfMonth = (ms: number): number => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const startOfPrevMonth = (ms: number): number => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(); };

function windowRev(jobs: JobRecord[], start: number, end: number, label: string): WindowRevenue {
  const inWin = jobs.filter((j) => j.status === 'completed' && j.ticketUsd > 0 && j.completedAt >= start && j.completedAt < end);
  return { label, revenue: sum(inWin.map((j) => j.ticketUsd)), jobs: inWin.length };
}

/** Revenue for standard windows, anchored at `now` (pass Date.now() in the UI). */
export function revenueWindows(jobs: JobRecord[], now: number): RevenueWindows {
  const sod = startOfDay(now);
  const end = now + 1;
  return {
    today: windowRev(jobs, sod, end, 'Today'),
    yesterday: windowRev(jobs, sod - DAY, sod, 'Yesterday'),
    thisWeek: windowRev(jobs, sod - 6 * DAY, end, 'This week'),
    thisMonth: windowRev(jobs, startOfMonth(now), end, 'This month'),
    lastMonth: windowRev(jobs, startOfPrevMonth(now), startOfMonth(now), 'Last month'),
    last90: windowRev(jobs, sod - 89 * DAY, end, 'Last 90 days'),
  };
}

// --- top rollups ---
export interface RevenueRollups {
  topCity: RevGroup | null;
  topService: RevGroup | null;
  topTechnician: RevGroup | null;
  highestAvgTicketService: RevGroup | null;
  highestLifetimeCustomer: RevGroup | null;
}
export function revenueRollups(jobs: JobRecord[]): RevenueRollups {
  const services = revenueByService(jobs);
  const highAvg = [...services].sort((a, b) => b.avgTicket - a.avgTicket)[0] ?? null;
  return {
    topCity: revenueByCity(jobs)[0] ?? null,
    topService: services[0] ?? null,
    topTechnician: revenueByTechnician(jobs)[0] ?? null,
    highestAvgTicketService: highAvg,
    highestLifetimeCustomer: topCustomers(jobs, 1)[0] ?? null,
  };
}

// --- formatting helpers ---
export function money(n: number): string { return `$${Math.round(n).toLocaleString('en-US')}`; }
const pctStr = (frac: number): string => `${Math.round(frac * 100)}%`;
const ratioStr = (r: number): string => `${(Math.round(r * 10) / 10).toFixed(1)}x`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function mdLabel(ms: number): string { const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()}`; }
function monthLabel(key: string): string { const [y, m] = key.split('-'); return `${MONTHS[Number(m) - 1]} '${y.slice(2)}`; }
