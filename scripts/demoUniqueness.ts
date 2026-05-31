/**
 * Demo: exercises the real uniqueness engine and prints example results.
 * Run: npx tsx scripts/demoUniqueness.ts
 */
import { MockProvider } from '../src/lib/ai/provider.mock';
import { generateBlock } from '../src/lib/ai/engine';
import { generateContent } from '../src/lib/ai/contentGenerators';
import { generateReviewResponse } from '../src/lib/ai/reviewResponseGenerator';
import { hasBannedOpener } from '../src/lib/uniqueness/bannedOpeners';
import type { BrandSettings } from '../src/types/models';
import type { RecentByType } from '../src/types/generation';

const brand: BrandSettings = {
  businessName: 'Wheel Rush Mobile Tire Repair',
  website: 'wheelrush.net',
  phone: '305-897-7030',
  serviceAreas: ['Miami-Dade', 'Broward'],
  services: ['Mobile tire repair'],
  notOffered: ['Rim repair'],
  socialHandles: ['@wheelrushllc'],
  ctas: ['Book now at wheelrush.net'],
  localKeywords: ['mobile tire repair Miami'],
  bannedPhrases: [],
  requiredPhrases: [],
  brandTone: 'helpful',
};

const emptyRecent = (): RecentByType => ({
  hook: [], caption: [], cta: [], script: [], review: [], reply: [],
});

console.log('=== UNIQUENESS: 20 sequential hooks ===');
const provider = new MockProvider();
const recent: string[] = [];
let regenTotal = 0;
const sims: number[] = [];
for (let i = 1; i <= 20; i++) {
  const r = generateBlock(provider, { type: 'hook', req: { platform: 'instagram' } }, brand, recent);
  regenTotal += r.regenerationCount;
  sims.push(r.similarityScore);
  recent.push(r.block.text);
  console.log(
    `${String(i).padStart(2)}. [${r.block.category}] sim=${r.similarityScore.toFixed(2)} regen=${r.regenerationCount} :: ${r.block.text}`,
  );
}
const distinct = new Set(recent).size;
const avgSim = sims.reduce((a, b) => a + b, 0) / sims.length;
console.log(`\nDistinct: ${distinct}/20 | avg similarity: ${avgSim.toFixed(3)} | total regenerations: ${regenTotal}`);

console.log('\n=== DUPLICATE DETECTION: forced collision ===');
const rec = emptyRecent();
const first = generateContent({ platform: 'instagram' }, brand, rec, provider);
console.log(`First hook  [${first.result.hook!.structureId}]: ${first.result.hook!.text}`);
rec.hook.push(first.result.hook!.text);
const second = generateContent({ platform: 'instagram' }, brand, rec, provider);
console.log(`Recent now contains the first hook. Second generation:`);
console.log(`Second hook [${second.result.hook!.structureId}]: ${second.result.hook!.text}`);
console.log(`Second hook similarity vs recent: ${second.records[0].similarityScore.toFixed(2)} (regenerations: ${second.records[0].regenerationCount})`);

console.log('\n=== REVIEW RESPONSES: 1-star, no banned openers, no fault admission ===');
const review = generateReviewResponse(
  { reviewText: 'Showed up late and left a mess.', rating: 1, city: 'Miami', service: 'flat tire repair', tone: 'professional' },
  brand,
  emptyRecent(),
  provider,
);
for (const [style, text] of Object.entries(review.result)) {
  console.log(`- (${style}) banned-opener=${hasBannedOpener(text)} :: ${text}`);
}
