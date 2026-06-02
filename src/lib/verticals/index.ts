// Vertical (industry) backbone — SaaS multi-business from day one. Every business
// MSOS stamps a `businessType` on businesses/{id}/settings/main; we map it to a
// VerticalConfig that tells the Director which revenue "product dimension" to
// group by and which service vocabulary / hook angles to use. Nothing is
// hardcoded to Wheel Rush or tires: tire is just the default when a business has
// no (or an unknown) type. Adding a vertical = adding one entry here.
import type { JobRecord } from '../director/types';

export type VerticalId =
  | 'tire' | 'roadside' | 'mechanic' | 'detailing' | 'oil' | 'battery' | 'fleet';

/** Which existing JobRecord field best represents this vertical's "product". */
export type ProductField = 'tireSize' | 'vehicle' | 'service';

export interface VerticalConfig {
  id: VerticalId;
  label: string;
  /** The headline revenue dimension beyond city/service/technician. */
  productDimension: { label: string; field: ProductField };
  /** Default service vocabulary for idea/hook generation (later phases). */
  serviceVocab: string[];
  /** Vertical-appropriate viral angles (later phases). */
  hookAngles: string[];
}

export const VERTICALS: Record<VerticalId, VerticalConfig> = {
  tire: {
    id: 'tire', label: 'Mobile Tire Service',
    productDimension: { label: 'Tire Size', field: 'tireSize' },
    serviceVocab: ['Mobile Tire Repair', 'Mobile Tire Replacement', 'Emergency Tire Service', 'Roadside Tire Service', 'Tire Mounting', 'Tire Balancing'],
    hookAngles: ['emergency rescue', 'we come to you', 'dealer price shock', 'real customer story', 'flat-tire mistake'],
  },
  roadside: {
    id: 'roadside', label: 'Roadside Assistance',
    productDimension: { label: 'Service', field: 'service' },
    serviceVocab: ['Jump Start', 'Lockout Service', 'Fuel Delivery', 'Tow', 'Tire Change', 'Winch Out'],
    hookAngles: ['stranded rescue', 'fast response time', 'late-night help', 'what to do when stuck'],
  },
  mechanic: {
    id: 'mechanic', label: 'Mobile Mechanic',
    productDimension: { label: 'Vehicle', field: 'vehicle' },
    serviceVocab: ['Brake Repair', 'Battery Replacement', 'Diagnostics', 'Starter/Alternator', 'Suspension', 'Tune-Up'],
    hookAngles: ['dealer price shock', 'we fix it in your driveway', 'common car mistake', 'diagnostic mystery'],
  },
  detailing: {
    id: 'detailing', label: 'Car Wash & Detailing',
    productDimension: { label: 'Package', field: 'service' },
    serviceVocab: ['Full Detail', 'Interior Detail', 'Exterior Detail', 'Ceramic Coating', 'Paint Correction'],
    hookAngles: ['satisfying transformation', 'before/after', 'we come to you', 'dirty-to-showroom'],
  },
  oil: {
    id: 'oil', label: 'Mobile Oil Change',
    productDimension: { label: 'Vehicle', field: 'vehicle' },
    serviceVocab: ['Full Synthetic Oil Change', 'Conventional Oil Change', 'Filter Change', 'Fluid Top-Off'],
    hookAngles: ['skip the shop wait', 'we come to you', 'oil-change mistake', 'how often should you change oil'],
  },
  battery: {
    id: 'battery', label: 'Mobile Battery Service',
    productDimension: { label: 'Vehicle', field: 'vehicle' },
    serviceVocab: ['Battery Replacement', 'Battery Testing', 'Jump Start', 'Alternator Check'],
    hookAngles: ['dead battery rescue', 'we come to you', 'battery warning signs', 'heat kills batteries'],
  },
  fleet: {
    id: 'fleet', label: 'Fleet Service',
    productDimension: { label: 'Vehicle', field: 'vehicle' },
    serviceVocab: ['Fleet Maintenance', 'Fleet Tires', 'Fleet Inspection', 'Preventive Maintenance'],
    hookAngles: ['minimize downtime', 'on-site fleet service', 'cost-per-mile savings', 'compliance & safety'],
  },
};

const DEFAULT_VERTICAL: VerticalId = 'tire';

const ALIASES: Record<string, VerticalId> = {
  tire: 'tire', tires: 'tire',
  roadside: 'roadside', towing: 'roadside',
  mechanic: 'mechanic', mobilemechanic: 'mechanic', repair: 'mechanic', auto: 'mechanic',
  detailing: 'detailing', detail: 'detailing', carwash: 'detailing', wash: 'detailing',
  oil: 'oil', oilchange: 'oil',
  battery: 'battery',
  fleet: 'fleet',
};

/** Map an MSOS businessType (or any vertical id/alias) to its config. Defaults to tire. */
export function verticalFor(businessType?: string | null): VerticalConfig {
  const key = (businessType ?? '').toLowerCase().replace(/[^a-z]/g, '');
  const id = (key && (ALIASES[key] ?? (key in VERTICALS ? (key as VerticalId) : undefined))) || DEFAULT_VERTICAL;
  return VERTICALS[id];
}

/** Read a job's product-dimension value for a given vertical (never hardcoded). */
export function productValue(job: JobRecord, v: VerticalConfig): string {
  return job[v.productDimension.field] || 'Unknown';
}
