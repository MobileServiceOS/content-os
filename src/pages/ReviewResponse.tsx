// Review Response Generator: review text + rating + tone -> three responses
// (short / professional / SEO-friendly). Never opens with a banned phrase, never
// auto-admits fault. Records history + cost; saves chosen response.
import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { TextField, TextArea, SelectField } from '../components/ui/Field';
import OutputBlock from '../components/generator/OutputBlock';
import ScoreBadges from '../components/ui/ScoreBadges';
import RoleGate from '../components/RoleGate';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { useGenerationHistory } from '../hooks/useGenerationHistory';
import { useReviewResponses } from '../hooks/useReviewResponses';
import { providerFor } from '../lib/ai/providers';
import { recordScores, type GeneratedRecord } from '../lib/ai/shared';
import { buildRecent } from '../lib/uniqueness/recent';
import { TONE_LABELS } from '../types/generation';
import type { Tone, ReviewResult } from '../types/generation';
import type { GenerationCost } from '../lib/ai/cost';

const TONES = Object.entries(TONE_LABELS).map(([value, label]) => ({ value: value as Tone, label }));
const RATINGS = [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? 's' : ''}` }));

interface Generated {
  result: ReviewResult;
  records: GeneratedRecord[];
  cost: GenerationCost;
}

export default function ReviewResponse() {
  const { brand, businessId } = useBusiness();
  const { user } = useAuth();
  const { entries, recordMany, recordCost } = useGenerationHistory();
  const { save: saveResponse } = useReviewResponses();

  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState('5');
  const [city, setCity] = useState('');
  const [service, setService] = useState('');
  const [tone, setTone] = useState<Tone>('professional');
  const [gen, setGen] = useState<Generated | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedStyle, setSavedStyle] = useState<string | null>(null);
  const [error, setError] = useState('');

  const recent = useMemo(() => buildRecent(entries), [entries]);

  async function generate() {
    if (!brand) return setError('Brand settings not loaded yet.');
    setBusy(true);
    setError('');
    setSavedStyle(null);
    try {
      const out = await providerFor(brand, businessId).generateReviewResponse(
        { reviewText, rating: Number(rating), city, service, tone },
        brand,
        recent,
      );
      setGen(out);
      if (user) {
        await recordMany(user.uid, out.records);
        await recordCost(user.uid, 'review', out.cost);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  async function save(style: 'short' | 'professional' | 'seo', response: string) {
    await saveResponse({ reviewText, rating: Number(rating), city, service, response, style });
    setSavedStyle(style);
  }

  return (
    <>
      <PageHeader title="Review Response" subtitle="Reply to customer reviews" />

      <div className="card stack">
        <TextArea label="Review text" value={reviewText} onChange={setReviewText} placeholder="Paste the customer's review" />
        <div className="grid grid-2">
          <SelectField label="Star rating" value={rating} onChange={setRating} options={RATINGS} />
          <SelectField label="Tone" value={tone} onChange={setTone} options={TONES} />
          <TextField label="City (optional)" value={city} onChange={setCity} placeholder="Miami" />
          <TextField label="Service (optional)" value={service} onChange={setService} placeholder="flat tire repair" />
        </div>
        <button className="btn btn-primary btn-block" onClick={() => void generate()} disabled={busy}>
          {busy ? 'Drafting…' : gen ? 'Regenerate' : 'Generate responses'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {gen && (
        <div className="card stack" style={{ marginTop: 16 }}>
          <div className="row between">
            <h2 style={{ margin: 0 }}>Responses</h2>
            {gen.records[0] && <ScoreBadges scores={recordScores(gen.records[0])} />}
          </div>
          {(['short', 'professional', 'seo'] as const).map((style) => {
            const text = style === 'short' ? gen.result.short : style === 'professional' ? gen.result.professional : gen.result.seoFriendly;
            const label = style === 'seo' ? 'SEO-friendly' : style[0].toUpperCase() + style.slice(1);
            return (
              <div key={style} className="stack">
                <OutputBlock label={label} text={text} />
                <RoleGate action="content.create">
                  <div className="row">
                    <button className="btn btn-sm" onClick={() => void save(style, text)}>Save this response</button>
                    {savedStyle === style && <span className="muted">Saved ✓</span>}
                  </div>
                </RoleGate>
              </div>
            );
          })}
          <div className="muted" style={{ fontSize: '0.8rem' }}>
            Provider: {gen.cost.provider} · ~{gen.cost.tokens} tokens · {gen.cost.generationTimeMs}ms · est ${gen.cost.estimatedCostUsd.toFixed(4)}
          </div>
        </div>
      )}
    </>
  );
}
