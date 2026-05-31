// Template banks for the Level 3 kinds (GBP, Local SEO, photo, engagement, tasks).
import type { SeoContentType, TaskCategory, TaskPriority } from '../../../types/level3';

export type LeadIntent = 'nurture' | 'quote' | 'missed_opportunity';

export const LEAD_MESSAGES: Record<LeadIntent, string[]> = {
  nurture: [
    'Just keeping our info handy in case a tire ever gives you trouble in {city}. Save it for later.',
    'No rush at all — whenever a tire acts up, we come to you across {area}.',
    'Filing this away for you: mobile {service} that shows up where you are. Here if you need us.',
  ],
  quote: [
    'Following up on your {service} quote — happy to lock in a time that works for you.',
    'Wanted to check in on that quote. Any questions before we get you scheduled?',
    'Still here to help with the {service}. Want me to hold a slot this week?',
  ],
  missed_opportunity: [
    'Looks like we missed connecting — still want to get that {service} handled in {city}?',
    'No worries if the timing was off. We can come to you whenever works.',
    'Circling back in case you still need a hand with the tire. We are mobile across {area}.',
  ],
};

export const MISSED_CALL_TEXTS: string[] = [
  'Sorry we missed your call! This is {business}. Got a tire issue in {city}? Reply here and we will help fast.',
  'Missed you just now — this is {business}. Tell us what is going on with the tire and we will get moving.',
  'Hey, this is {business} returning your call. Where are you and what is the tire doing?',
];
export const MISSED_CALL_FOLLOWUPS: string[] = [
  'Still need a hand with the tire? We can roll out to you.',
  'Just checking back — want us to come take a look?',
];
export const MISSED_CALL_CALLBACKS: string[] = [
  'Call back the missed tire lead within 30 minutes.',
  'If no reply by text, try one more call this afternoon.',
];

export const REVIEW_REQUESTS: string[] = [
  'Hope the tire is treating you well! A quick review would mean a lot and helps other {city} drivers find us.',
  'If the {service} hit the mark, a short review goes a long way for a small local crew.',
];
export const REVIEW_FOLLOWUPS: string[] = [
  'No pressure at all — if you get a minute, that review link is still open. Either way, drive safe out there.',
  'Just a friendly nudge on that review whenever you are free. Appreciate you either way.',
];

export interface TaskTemplate { title: string; detail: string; priority: TaskPriority }
export const TASK_TEMPLATES: Record<TaskCategory, TaskTemplate[]> = {
  seo: [
    { title: 'Publish a city page for {city}', detail: 'Use the SEO Studio (city page).', priority: 'medium' },
    { title: 'Add an FAQ targeting AI-search questions', detail: 'Generate an FAQ in the SEO Studio.', priority: 'medium' },
  ],
  gbp: [
    { title: 'Post a fresh GBP update', detail: 'Generate a compliant post in the GBP Studio.', priority: 'high' },
    { title: 'Optimize 3 GBP photos', detail: 'Use the Photo optimizer on the Media page.', priority: 'low' },
  ],
  review: [
    { title: 'Respond to new reviews', detail: 'Draft responses in the Review generator.', priority: 'high' },
    { title: 'Send review requests to recent jobs', detail: 'Use the review request templates.', priority: 'medium' },
  ],
  content: [
    { title: 'Distribute the latest job to all platforms', detail: 'Use New Job → Distribute.', priority: 'high' },
    { title: 'Repurpose a top post', detail: 'Use the Repurpose engine.', priority: 'low' },
  ],
};

// GBP descriptions — NEVER contain a CTA (compliance). Links live in separate fields.
export const GBP_DESCRIPTIONS: string[] = [
  'A {service} handled on-site for a {vehicle} in {city}, start to finish in about {completionTime}.',
  'Out in {city} today: a {tireSize} sorted right where the driver was parked. No tow, no shop.',
  'Mobile tire work in {city} means the {service} comes to the driver — driveway, lot, or roadside.',
  'Another {city} driver back on the road after a quick {service}, on-site within {responseTime}.',
  'Real mobile tire help across {area}: we meet drivers where they are and keep them moving.',
  'A flat does not have to wreck the day. This one in {city} was about a {completionTime} fix.',
  'On-location {service} in {city} — the kind of help that shows up instead of making you drive.',
];

// CTA phrases banned inside a GBP description.
export const GBP_BANNED_CTAS: string[] = [
  'call now',
  'book now',
  'contact us',
  'schedule today',
  'text us now',
  'call today',
  'book today',
  'message us',
  'call us',
];

export const HASHTAG_BANK: string[] = [
  '#mobiletire',
  '#flattire',
  '#tirerepair',
  '#roadside',
  '#mobilemechanic',
  '#tireservice',
  '#mobiletirerepair',
  '#tirechange',
];

// Questions people actually ask (AI-search / answer-engine optimization).
export const AI_SEARCH_QUESTIONS: string[] = [
  'Who can replace a tire at my house?',
  'Can a flat tire be repaired without a tow?',
  'How long does mobile tire replacement take?',
  'Can someone install a tire after hours?',
  'Is mobile tire repair cheaper than a tow?',
  'What tire sizes can a mobile service handle?',
];

export const PHOTO_CATEGORIES: string[] = [
  'Service in progress',
  'Before and after',
  'Vehicle on location',
  'Tools and equipment',
  'Completed job',
];

/** Body skeletons per SEO content type (filled by the generator). */
export const SEO_BODIES: Record<SeoContentType, string[]> = {
  service_page: [
    '{service} brought to you across {area}. Instead of driving on a bad tire or waiting for a tow, a mobile tech comes to your location and handles it on the spot — driveway, parking lot, or roadside. Most jobs wrap in about {completionTime}.',
  ],
  city_page: [
    'Mobile tire service in {city}: when a tire goes flat, you should not have to risk the drive to a shop. A technician comes to where you are in {city} and gets you rolling again, usually on-site within {responseTime}.',
  ],
  faq: [
    'Common questions about mobile tire service in {city}, answered plainly for drivers who need real help fast.',
  ],
  ai_search: [
    'Short, direct answers to the questions drivers actually ask about mobile tire service in {area}.',
  ],
  entity: [
    'Mobile tire service in {city} covering common vehicles and tire sizes, with real on-location repair and replacement.',
  ],
};
