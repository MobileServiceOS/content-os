// HOOK VARIATION SYSTEM — ≥4 structures across all 10 categories.
import type { Structure } from './types';
import type { HookCategory } from '../../../types/generation';

export const HOOK_STRUCTURES: Structure<HookCategory>[] = [
  // curiosity
  { id: 'hook-cur-1', category: 'curiosity', template: 'Most {city} drivers have no idea this is even an option.' },
  { id: 'hook-cur-2', category: 'curiosity', template: "Here's what nobody tells you about a {service}." },
  { id: 'hook-cur-3', category: 'curiosity', template: "Bet you didn't know a {service} could happen right in your driveway." },
  { id: 'hook-cur-4', category: 'curiosity', template: 'There’s a reason {city} drivers keep our number saved.' },
  // shock
  { id: 'hook-shk-1', category: 'shock', template: 'A {tireSize} blowout at {timeOfDay} is scarier than it sounds.' },
  { id: 'hook-shk-2', category: 'shock', template: "That little nail? It nearly cost a full set of tires." },
  { id: 'hook-shk-3', category: 'shock', template: 'One pothole in {city} and the whole day changed.' },
  { id: 'hook-shk-4', category: 'shock', template: 'This {vehicle} sat on the shoulder for hours — it didn’t have to.' },
  // mistake
  { id: 'hook-mis-1', category: 'mistake', template: 'The biggest mistake drivers make after a flat in {city}.' },
  { id: 'hook-mis-2', category: 'mistake', template: "Driving on a flat 'just to the shop' wrecks more than the tire." },
  { id: 'hook-mis-3', category: 'mistake', template: 'Most people call a tow first. That’s the costly move.' },
  { id: 'hook-mis-4', category: 'mistake', template: 'Ignoring that slow leak is how a {tireSize} ends up unsalvageable.' },
  // myth
  { id: 'hook-myt-1', category: 'myth', template: 'No, a plugged tire isn’t automatically unsafe.' },
  { id: 'hook-myt-2', category: 'myth', template: "'You always need a new tire' — not true, and here's why." },
  { id: 'hook-myt-3', category: 'myth', template: 'Mobile tire service isn’t pricier than the shop.' },
  { id: 'hook-myt-4', category: 'myth', template: 'A {service} doesn’t have to mean hours of waiting.' },
  // emergency
  { id: 'hook-emg-1', category: 'emergency', template: 'Stuck on the shoulder in {city}? Don’t get out of the car.' },
  { id: 'hook-emg-2', category: 'emergency', template: 'Blowout on the highway — here’s the first thing to do.' },
  { id: 'hook-emg-3', category: 'emergency', template: 'Flat at {timeOfDay} with no spare? You still have options.' },
  { id: 'hook-emg-4', category: 'emergency', template: 'Stranded with a {vehicle} full of kids — we’ve got you.' },
  // customer_story
  { id: 'hook-cst-1', category: 'customer_story', template: 'A {city} driver called us {responseTime} before a flight.' },
  { id: 'hook-cst-2', category: 'customer_story', template: 'Got a call from a {vehicle} owner stuck in a parking garage.' },
  { id: 'hook-cst-3', category: 'customer_story', template: 'One driver had given up — then remembered we come to you.' },
  { id: 'hook-cst-4', category: 'customer_story', template: 'A night-shift nurse, a flat tire, {timeOfDay}. Sorted.' },
  // convenience
  { id: 'hook-cnv-1', category: 'convenience', template: 'Your {service}, done in your driveway in {city}.' },
  { id: 'hook-cnv-2', category: 'convenience', template: 'No tow, no waiting room, no rearranging your day.' },
  { id: 'hook-cnv-3', category: 'convenience', template: 'We bring the shop to your {vehicle}.' },
  { id: 'hook-cnv-4', category: 'convenience', template: 'Coffee in hand, tire fixed in the driveway. That’s the idea.' },
  // time_savings
  { id: 'hook-tim-1', category: 'time_savings', template: 'A {service} in about {completionTime}, not half a day.' },
  { id: 'hook-tim-2', category: 'time_savings', template: 'We’re usually rolling to you within {responseTime}.' },
  { id: 'hook-tim-3', category: 'time_savings', template: 'Skip the shop wait — back on the road in {completionTime}.' },
  { id: 'hook-tim-4', category: 'time_savings', template: '{responseTime} to arrive, {completionTime} to fix. Done.' },
  // cost_savings
  { id: 'hook-cos-1', category: 'cost_savings', template: 'A {service} can cost less than one tow.' },
  { id: 'hook-cos-2', category: 'cost_savings', template: 'Patch it right and skip a whole new {tireSize}.' },
  { id: 'hook-cos-3', category: 'cost_savings', template: 'Why pay tow + shop + time off work?' },
  { id: 'hook-cos-4', category: 'cost_savings', template: 'Catch a slow leak early and save the set.' },
  // educational
  { id: 'hook-edu-1', category: 'educational', template: 'Here’s how to tell a patch from a plug.' },
  { id: 'hook-edu-2', category: 'educational', template: 'What that {tireSize} sidewall number actually means.' },
  { id: 'hook-edu-3', category: 'educational', template: 'Three signs your {vehicle} needs a tire looked at.' },
  { id: 'hook-edu-4', category: 'educational', template: 'How a {service} actually works, start to finish.' },
];
