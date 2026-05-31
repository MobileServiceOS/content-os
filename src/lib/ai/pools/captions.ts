// CAPTION VARIATION SYSTEM — ≥3 structures across all 10 frameworks.
import type { Structure } from './types';
import type { CaptionFramework } from '../../../types/generation';

export const CAPTION_STRUCTURES: Structure<CaptionFramework>[] = [
  // problem_solution
  { id: 'cap-ps-1', category: 'problem_solution', template: 'Flat tire in {city}? {transition} we come to you and handle the {service} on the spot. {cta}' },
  { id: 'cap-ps-2', category: 'problem_solution', template: '{painPoint} {transition} a quick {service} in your driveway fixes it. {cta}' },
  { id: 'cap-ps-3', category: 'problem_solution', template: 'Nail in the tread? {transition} most are a simple repair, not a replacement. {cta}' },
  // storytelling
  { id: 'cap-st-1', category: 'storytelling', template: '{opener} a {city} driver was stuck at {timeOfDay}. One call, {responseTime} later, back on the road. {cta}' },
  { id: 'cap-st-2', category: 'storytelling', template: '{opener} a {vehicle} owner thought the day was ruined. It wasn’t. {cta}' },
  { id: 'cap-st-3', category: 'storytelling', template: '{opener} what looked like a tow-truck situation turned into a {completionTime} fix. {cta}' },
  // timeline
  { id: 'cap-tl-1', category: 'timeline', template: 'Call comes in. {responseTime} to arrive. {completionTime} to fix. Driver’s gone. That’s a {service} with us.' },
  { id: 'cap-tl-2', category: 'timeline', template: 'Morning flat, midday meeting, no problem — here’s how the timeline worked out. {cta}' },
  { id: 'cap-tl-3', category: 'timeline', template: "From 'I'm stranded' to 'I'm rolling' in {completionTime}. {cta}" },
  // customer_perspective
  { id: 'cap-cp-1', category: 'customer_perspective', template: 'From the driver’s seat: a flat in {city} used to mean a lost day. Not anymore. {cta}' },
  { id: 'cap-cp-2', category: 'customer_perspective', template: 'If you’ve ever waited hours at a shop, you’ll get why people switch. {cta}' },
  { id: 'cap-cp-3', category: 'customer_perspective', template: 'You don’t have to change a tire on the shoulder. Let us. {cta}' },
  // educational
  { id: 'cap-ed-1', category: 'educational', template: 'Quick one: a {service} repairs the tread, not the sidewall. Here’s why that matters. {cta}' },
  { id: 'cap-ed-2', category: 'educational', template: 'Tire pressure, tread, and that little nail — what to watch on your {vehicle}. {cta}' },
  { id: 'cap-ed-3', category: 'educational', template: 'Patch vs plug vs replace — when each one is the right call. {cta}' },
  // comparison
  { id: 'cap-cm-1', category: 'comparison', template: 'Tow + shop + waiting room. Or a {service} in your driveway. {transition} the choice is easy. {cta}' },
  { id: 'cap-cm-2', category: 'comparison', template: 'Shop visit: half a day. Mobile: about {completionTime}. {cta}' },
  { id: 'cap-cm-3', category: 'comparison', template: 'DIY spare on the shoulder vs a pro {service} where you are. {cta}' },
  // before_after
  { id: 'cap-ba-1', category: 'before_after', template: 'Before: stranded in {city} at {timeOfDay}. After: back on the road in {completionTime}. {cta}' },
  { id: 'cap-ba-2', category: 'before_after', template: 'Before: a slow leak ignored. After: a full {tireSize} replacement. Catch it early. {cta}' },
  { id: 'cap-ba-3', category: 'before_after', template: 'Before: panic. After: a quick {service} and a normal day. {cta}' },
  // emergency
  { id: 'cap-em-1', category: 'emergency', template: 'Stranded with a flat in {city}? Stay safe, stay in the car, and call. {cta}' },
  { id: 'cap-em-2', category: 'emergency', template: 'Highway blowout on a {vehicle}? Here’s the move — and we’re on the way. {cta}' },
  { id: 'cap-em-3', category: 'emergency', template: 'No spare, {timeOfDay}, kids in the back. We prioritize calls like that. {cta}' },
  // myth_busting
  { id: 'cap-mb-1', category: 'myth_busting', template: 'Myth: a plugged tire is unsafe. Reality: done right, it’s solid. {cta}' },
  { id: 'cap-mb-2', category: 'myth_busting', template: 'Myth: mobile costs more. Reality: often less than a tow. {cta}' },
  { id: 'cap-mb-3', category: 'myth_busting', template: 'Myth: you always need a new tire. Reality: many are a simple {service}. {cta}' },
  // convenience
  { id: 'cap-cv-1', category: 'convenience', template: 'Driveway, office lot, roadside — your {service} happens where you are in {city}. {cta}' },
  { id: 'cap-cv-2', category: 'convenience', template: 'No tow, no waiting room, no day off work. {cta}' },
  { id: 'cap-cv-3', category: 'convenience', template: 'We bring the shop to your {vehicle}. {cta}' },
];
