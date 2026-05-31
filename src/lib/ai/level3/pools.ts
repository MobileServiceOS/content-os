// Template banks for the Level 3 kinds (GBP, Local SEO, photo).
import type { SeoContentType } from '../../../types/level3';

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
