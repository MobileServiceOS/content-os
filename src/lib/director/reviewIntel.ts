// Phase 4 — Review Intelligence. Pure analysis over the owner's REAL reviews
// (pasted in; no live GBP API yet, so nothing is invented). Extracts praise +
// complaint themes, the most-mentioned city/service/technician (matched against
// the connected business's own vocab), and turns them into response / GBP /
// video / SEO opportunities. Deterministic + unit-tested. Swap the intake for the
// GBP reviews API in Phase 8 with no change to the analysis.

export interface EnteredReview { text: string; rating?: number; }
export interface ThemeCount { theme: string; label: string; count: number; example?: string; }
export interface MentionCount { name: string; count: number; }
export interface ReviewVocab { cities: string[]; services: string[]; technicians: string[]; }
export interface ReviewAnalysis {
  count: number;
  avgRating: number | null;
  praise: ThemeCount[];
  complaints: ThemeCount[];
  topCity: MentionCount | null;
  topService: MentionCount | null;
  topTechnician: MentionCount | null;
}

// theme key -> { label, content angle, keyword patterns }
const PRAISE: Record<string, { label: string; angle: string; kw: RegExp }> = {
  convenience: { label: 'Convenience', angle: 'We Come To You', kw: /came to (me|my|us)|come to you|convenient|driveway|at work|didn'?t (have to )?leave|on[- ]site/i },
  speed: { label: 'Speed', angle: '20-Minute Rescue', kw: /\bfast\b|quick|prompt|on time|right away|minutes|same[- ]day/i },
  professional: { label: 'Professionalism', angle: 'Meet the Tech', kw: /professional|courteous|clean|knowledgeable|polite|friendly/i },
  honest: { label: 'Honesty', angle: 'No-Upsell Promise', kw: /honest|fair|no upsell|transparent|trust|didn'?t try to/i },
  price: { label: 'Price', angle: 'Half the Dealer Price', kw: /affordable|reasonable|great price|cheaper|worth it|saved/i },
};
const COMPLAINT: Record<string, { label: string; kw: RegExp }> = {
  wait_time: { label: 'Wait time', kw: /\blate\b|waited|slow|took (forever|hours)|behind schedule/i },
  price: { label: 'Price', kw: /expensive|overpriced|pricey|too much|rip ?off/i },
  communication: { label: 'Communication', kw: /no (call|show)|didn'?t (call|answer|show)|rescheduled|cancel/i },
  quality: { label: 'Quality', kw: /wrong|had to (come|go) back|redo|leak|again/i },
  rude: { label: 'Attitude', kw: /rude|unprofessional|attitude|dismissive/i },
};

/** Parse pasted reviews: one per line, optional leading rating ("5", "5★", "5 -"). */
export function parseReviews(raw: string): EnteredReview[] {
  return raw.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const m = line.match(/^(\d(?:\.\d)?)\s*(?:★|stars?|\/5)?\s*[-–:|]?\s*(.*)$/i);
    if (m && m[2]) {
      const r = Number(m[1]);
      return { rating: r >= 1 && r <= 5 ? r : undefined, text: m[2] };
    }
    return { text: line };
  });
}

const countMentions = (reviews: EnteredReview[], names: string[]): MentionCount[] =>
  names
    .map((name) => ({ name, count: reviews.filter((r) => name && new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(r.text)).length }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count);

export function analyzeReviews(reviews: EnteredReview[], vocab: ReviewVocab): ReviewAnalysis {
  const rated = reviews.filter((r) => typeof r.rating === 'number');
  const themeScan = <T extends { label: string; kw: RegExp }>(dict: Record<string, T>): ThemeCount[] => {
    const out: ThemeCount[] = [];
    for (const [theme, def] of Object.entries(dict)) {
      const hits = reviews.filter((r) => def.kw.test(r.text));
      if (hits.length) out.push({ theme, label: def.label, count: hits.length, example: hits[0].text });
    }
    return out.sort((a, b) => b.count - a.count);
  };
  return {
    count: reviews.length,
    avgRating: rated.length ? rated.reduce((a, r) => a + (r.rating as number), 0) / rated.length : null,
    praise: themeScan(PRAISE),
    complaints: themeScan(COMPLAINT),
    topCity: countMentions(reviews, vocab.cities)[0] ?? null,
    topService: countMentions(reviews, vocab.services)[0] ?? null,
    topTechnician: countMentions(reviews, vocab.technicians)[0] ?? null,
  };
}

export interface ReviewOpportunities {
  responses: string[];
  gbpPosts: string[];
  videos: string[];
  seo: string[];
}

export function reviewOpportunities(a: ReviewAnalysis, vocab: ReviewVocab): ReviewOpportunities {
  const o: ReviewOpportunities = { responses: [], gbpPosts: [], videos: [], seo: [] };
  const topPraise = a.praise[0];
  const topComplaint = a.complaints[0];
  const city = a.topCity?.name ?? vocab.cities[0];
  const service = a.topService?.name ?? vocab.services[0];

  if (topPraise) {
    const angle = PRAISE[topPraise.theme]?.angle ?? topPraise.label;
    o.videos.push(`Customers frequently mention ${topPraise.label.toLowerCase()}. Create content around: "${angle}".`);
    o.gbpPosts.push(`GBP post: lead with what customers love — ${topPraise.label.toLowerCase()}${city ? ` in ${city}` : ''}. Quote a real review.`);
    o.responses.push(`For 5★ reviews praising ${topPraise.label.toLowerCase()}: thank them, name the value ("glad we could come to you"), invite them back.`);
  }
  if (topComplaint) {
    o.responses.push(`For the recurring "${topComplaint.label.toLowerCase()}" complaint: respond publicly, own it, state the fix, move details offline.`);
    o.videos.push(`Pre-empt the "${topComplaint.label.toLowerCase()}" objection with a short explainer (e.g. live ETA texting).`);
  }
  if (city && service) {
    o.seo.push(`${service} in ${city}`, `${service} near me`, `mobile ${service.toLowerCase()} ${city}`);
    o.gbpPosts.push(`Service-area GBP post targeting ${city} for ${service.toLowerCase()}.`);
  }
  if (a.topTechnician) {
    o.videos.push(`Reviewers mention ${a.topTechnician.name} — film a "meet the tech" feature to build trust.`);
  }
  return o;
}
