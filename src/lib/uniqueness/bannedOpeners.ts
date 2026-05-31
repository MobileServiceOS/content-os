// Banned opener detection. The global list comes from the Wheel Rush content
// rules; businesses can add their own via UniquenessConfig.bannedOpenings.
import { normalize } from './similarity';

export const DEFAULT_BANNED_OPENERS = [
  'thank you',
  'thanks for choosing us',
  'we appreciate your business',
  'glad we could help',
  'a customer in',
  'wheel rush completed',
];

export function matchedOpeners(text: string, extra: string[] = []): string[] {
  const n = normalize(text);
  return [...DEFAULT_BANNED_OPENERS, ...extra.map(normalize)].filter(
    (o) => o && n.startsWith(o),
  );
}

export function hasBannedOpener(text: string, extra: string[] = []): boolean {
  return matchedOpeners(text, extra).length > 0;
}
