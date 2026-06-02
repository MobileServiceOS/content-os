// Connects social performance to live MSOS revenue. Answers: views vs revenue,
// content-type vs revenue, city-content vs city-revenue, and surfaces content
// opportunities (where revenue is high but content/views are low). Pure +
// unit-tested; takes the synced SocialData + the live JobRecord[] from MSOS.
import type { JobRecord } from '../types';
import { revenueByCity, revenueByService, money } from '../msosWidgets';
import { topCities, topServices } from './socialIntel';
import type { SocialData, SocialVocab } from './types';

export interface CrossRow { key: string; videos: number; views: number; revenue: number }

function join(views: { key: string; views: number; videos: number }[], rev: { key: string; revenue: number }[]): CrossRow[] {
  const vMap = new Map(views.map((v) => [v.key, v]));
  const rMap = new Map(rev.map((r) => [r.key, r]));
  const keys = new Set([...vMap.keys(), ...rMap.keys()]);
  return [...keys]
    .map((key) => ({ key, views: vMap.get(key)?.views ?? 0, videos: vMap.get(key)?.videos ?? 0, revenue: rMap.get(key)?.revenue ?? 0 }))
    .sort((a, b) => b.revenue - a.revenue);
}

export interface ViewsVsRevenue { totalViews: number; totalRevenue: number; summary: string }
export function viewsVsRevenue(d: SocialData, jobs: JobRecord[]): ViewsVsRevenue {
  const totalViews = d.totals.views;
  const totalRevenue = jobs.filter((j) => j.status === 'completed').reduce((a, j) => a + j.ticketUsd, 0);
  const per = totalViews > 0 ? totalRevenue / totalViews : 0;
  return {
    totalViews, totalRevenue,
    summary: totalViews > 0
      ? `${money(totalRevenue)} revenue against ${totalViews.toLocaleString()} TikTok views — about ${money(per)} of revenue per view of attention.`
      : 'No TikTok views yet to compare against revenue.',
  };
}

export const contentVsRevenue = (d: SocialData, jobs: JobRecord[], v: SocialVocab): CrossRow[] =>
  join(topServices(d, v), revenueByService(jobs));

export const cityVsRevenue = (d: SocialData, jobs: JobRecord[], v: SocialVocab): CrossRow[] =>
  join(topCities(d, v), revenueByCity(jobs));

/** Where the money is but the content isn't — your next videos. */
export function contentOpportunities(d: SocialData, jobs: JobRecord[], v: SocialVocab): string[] {
  const out: string[] = [];
  for (const row of cityVsRevenue(d, jobs, v)) {
    if (row.revenue > 0 && row.views < row.revenue) { // revenue outpaces attention
      out.push(`${row.key}: ${money(row.revenue)} in revenue but only ${row.views.toLocaleString()} TikTok views — make more ${row.key} content.`);
    }
  }
  for (const row of contentVsRevenue(d, jobs, v)) {
    if (row.revenue > 0 && row.videos === 0) {
      out.push(`${row.key}: ${money(row.revenue)} revenue and zero TikTok videos — start featuring it.`);
    }
  }
  return out.slice(0, 6);
}
