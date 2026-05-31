// SOCIAL REPLY VARIATION SYSTEM — structures keyed by intent. The generator
// returns three distinct replies per request.
import type { Structure } from './types';
import type { SocialIntent } from '../../../types/generation';

export const SOCIAL_STRUCTURES: Structure<SocialIntent>[] = [
  // question
  { id: 'soc-q-1', category: 'question', template: 'Great question! Send us your location and we’ll get you a quick ETA.' },
  { id: 'soc-q-2', category: 'question', template: 'Happy to explain — what {vehicle} are you running and where are you parked?' },
  { id: 'soc-q-3', category: 'question', template: 'Good one. Short answer: yes, we can usually help with that. {cta}' },
  { id: 'soc-q-4', category: 'question', template: 'Ask away — we’d rather you call with questions than risk the drive.' },
  // pricing
  { id: 'soc-p-1', category: 'pricing', template: 'Pricing depends on the tire and service, but you’ll always get a quote before any work. {cta}' },
  { id: 'soc-p-2', category: 'pricing', template: 'Fair question — it’s usually less than a tow plus a shop visit. Want a quick quote?' },
  { id: 'soc-p-3', category: 'pricing', template: 'We keep it transparent: the number comes up front. DM your details. {cta}' },
  // booking
  { id: 'soc-b-1', category: 'booking', template: 'Let’s get you booked. {cta}' },
  { id: 'soc-b-2', category: 'booking', template: 'We can roll out — send your location and a good time. {responseTime} is typical.' },
  { id: 'soc-b-3', category: 'booking', template: 'On it. Tap to book or drop your address and we’ll confirm an ETA.' },
  // complaint
  { id: 'soc-c-1', category: 'complaint', template: 'That’s not what we want to hear. DM us the details and we’ll make it right.' },
  { id: 'soc-c-2', category: 'complaint', template: 'We take this seriously — can you message us so we can look into it directly?' },
  { id: 'soc-c-3', category: 'complaint', template: 'Sorry it fell short. Let’s connect and sort it out.' },
  // thank_you
  { id: 'soc-t-1', category: 'thank_you', template: 'Means a lot — enjoy the smooth ride!' },
  { id: 'soc-t-2', category: 'thank_you', template: 'Appreciate you! Save our number for next time.' },
  { id: 'soc-t-3', category: 'thank_you', template: 'You’re the reason we do this. Catch you out there.' },
  // general
  { id: 'soc-g-1', category: 'general', template: 'Appreciate you stopping by! {cta}' },
  { id: 'soc-g-2', category: 'general', template: 'Right back at you — drive safe out in {city}.' },
  { id: 'soc-g-3', category: 'general', template: 'Love the support. Let us know if you ever need us.' },
];
