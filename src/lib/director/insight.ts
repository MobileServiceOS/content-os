// The 4-part insight frame every revenue widget carries: what happened, why,
// recommended action, and an expected revenue impact. The impact is a transparent
// estimate (a modest uplift on the segment's own revenue from focused effort),
// labeled as such — never presented as a guarantee.
import type { RevGroup } from './msosWidgets';
import { money } from './msosWidgets';

export interface RevenueInsight {
  whatHappened: string;
  why: string;
  action: string;
  impactUsd: number;
  impactLabel: string;
}

/** Assumed lift on a strong segment from doubling down with focused content. */
export const FOCUS_UPLIFT = 0.12;

const pct = (frac: number): string => `${Math.round(frac * 100)}%`;

/**
 * Build the insight for a "top segment" rollup.
 * @param subject e.g. "Hollywood" | "Mobile Tire Replacement" | "Marcus"
 * @param dimension human label e.g. "city" | "service" | "technician"
 * @param group the segment's revenue stats (share is fraction of period revenue)
 * @param action the recommended next step (caller supplies, e.g. "Create more Hollywood content.")
 * @param uplift override the default focus uplift
 */
export function revenueInsight(
  subject: string,
  dimension: string,
  group: RevGroup,
  action: string,
  uplift: number = FOCUS_UPLIFT,
): RevenueInsight {
  const impactUsd = Math.round(group.revenue * uplift);
  return {
    whatHappened: `${subject} generated ${pct(group.share)} of revenue (${money(group.revenue)} across ${group.jobs} job${group.jobs === 1 ? '' : 's'}).`,
    why: `It leads your ${dimension} mix — ${group.jobs} job${group.jobs === 1 ? '' : 's'} at ${money(group.avgTicket)} average ticket.`,
    action,
    impactUsd,
    impactLabel: `+${money(impactUsd)} potential (est. ${Math.round(uplift * 100)}% lift from focused content)`,
  };
}
