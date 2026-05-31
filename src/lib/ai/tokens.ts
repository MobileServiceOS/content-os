// Token substitution shared by the mock provider and the script/repurpose
// generators. Replaces {service}, {city}, {cta}, {opener}, ... with brand-aware
// values, rotating filler variants by `rot` so repeats still read differently.
import type { GenerationRequest } from '../../types/generation';
import type { BrandSettings } from '../../types/models';
import { CTA_BANK } from './pools/ctas';
import { FILLERS } from './pools/fillers';

export function pickVariant<T>(arr: readonly T[], rot: number, fallback: T): T {
  return arr.length ? arr[rot % arr.length] : fallback;
}

export function substitute(
  template: string,
  req: GenerationRequest,
  brand: BrandSettings,
  rot: number,
): string {
  const area = brand.serviceAreas?.[0] ?? 'your area';
  // Service names read as common nouns mid-sentence ("a mobile tire repair").
  const service = (req.service ?? brand.services?.[0] ?? 'mobile tire service').toLowerCase();
  const tokens: Record<string, string> = {
    service,
    city: req.city ?? area,
    area,
    vehicle: req.vehicle ?? 'vehicle',
    tireSize: req.tireSize ?? 'tire',
    timeOfDay: req.timeOfDay ?? 'the worst time',
    responseTime: req.responseTime ?? 'minutes',
    completionTime: req.completionTime ?? '30 minutes',
    cta: pickVariant(brand.ctas?.length ? brand.ctas : CTA_BANK, rot, 'Book now.'),
    phone: brand.phone ?? '',
    website: brand.website ?? '',
    opener: pickVariant(FILLERS.opener, rot, 'Recently,'),
    transition: pickVariant(FILLERS.transition, rot, 'So'),
    closer: pickVariant(FILLERS.closer, rot, ''),
    painPoint: pickVariant(FILLERS.painPoint, rot, 'A flat never picks a good time.'),
    benefit: pickVariant(FILLERS.benefit, rot, 'back on the road fast'),
  };
  return template
    .replace(/\{(\w+)\}/g, (_m, key: string) => tokens[key] ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}
