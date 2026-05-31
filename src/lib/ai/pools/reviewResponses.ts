// REVIEW RESPONSE VARIATION SYSTEM — structures keyed by sentiment.
// None start with banned openers ("Thank you…", "Thanks for choosing us…",
// "Glad we could help…", "We appreciate your business…"). Negative responses
// never automatically admit fault.
import type { Structure } from './types';

export type ReviewSentiment = 'positive' | 'neutral' | 'negative';

export const REVIEW_STRUCTURES: Structure<ReviewSentiment>[] = [
  // positive
  { id: 'rev-pos-1', category: 'positive', template: 'Reviews like this make the whole crew smile. So glad the {service} in {city} went smoothly.' },
  { id: 'rev-pos-2', category: 'positive', template: 'It genuinely means a lot that you took the time to write this. Getting drivers in {city} rolling again is the goal.' },
  { id: 'rev-pos-3', category: 'positive', template: 'Stories like yours are exactly why we do this. Enjoy the smooth ride out there.' },
  { id: 'rev-pos-4', category: 'positive', template: 'Love hearing this. {city} drivers deserve a fast {service}, and we’re happy it landed that way.' },
  // neutral
  { id: 'rev-neu-1', category: 'neutral', template: 'Honest feedback like this helps us sharpen how we handle a {service} in {city}.' },
  { id: 'rev-neu-2', category: 'neutral', template: 'Good points here — we’ll take them straight back to the team.' },
  { id: 'rev-neu-3', category: 'neutral', template: 'Appreciate you laying that out. If anything about the {service} fell short, we want to make it right.' },
  { id: 'rev-neu-4', category: 'neutral', template: 'Fair feedback, and we’re listening. Reach out anytime and we’ll dig in.' },
  // negative
  { id: 'rev-neg-1', category: 'negative', template: 'We hear you, and we don’t take this lightly. A {service} in {city} should go better than this.' },
  { id: 'rev-neg-2', category: 'negative', template: 'This isn’t the experience we aim for. We’d like to understand what happened and make it right.' },
  { id: 'rev-neg-3', category: 'negative', template: 'Sorry the visit missed the mark. Reach out so we can look into the {service} directly.' },
  { id: 'rev-neg-4', category: 'negative', template: 'Feedback like this gets our full attention. Let’s connect so we can sort it out.' },
];
