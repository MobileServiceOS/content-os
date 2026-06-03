// Social Reply Generator: platform + comment/DM + tone + intent -> three distinct
// human-sounding replies. Records history + cost; saves chosen reply.
import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { TextArea, SelectField } from '../components/ui/Field';
import OutputBlock from '../components/generator/OutputBlock';
import ScoreBadges from '../components/ui/ScoreBadges';
import RoleGate from '../components/RoleGate';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { useGenerationHistory } from '../hooks/useGenerationHistory';
import { useSocialReplies } from '../hooks/useSocialReplies';
import { providerFor } from '../lib/ai/providers';
import { recordScores, type GeneratedRecord } from '../lib/ai/shared';
import { buildRecent } from '../lib/uniqueness/recent';
import { PLATFORM_LABELS, TONE_LABELS } from '../types/generation';
import type { Platform, Tone, SocialIntent, SocialResult } from '../types/generation';
import type { GenerationCost } from '../lib/ai/cost';

const PLATFORMS = Object.entries(PLATFORM_LABELS).map(([value, label]) => ({ value: value as Platform, label }));
const TONES = Object.entries(TONE_LABELS).map(([value, label]) => ({ value: value as Tone, label }));
const INTENTS: { value: SocialIntent; label: string }[] = [
  { value: 'question', label: 'Question' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'booking', label: 'Booking' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'thank_you', label: 'Thank You' },
  { value: 'general', label: 'General Engagement' },
];

interface Generated {
  result: SocialResult;
  records: GeneratedRecord[];
  cost: GenerationCost;
}

export default function SocialReply({ embedded = false }: { embedded?: boolean } = {}) {
  const { brand, businessId } = useBusiness();
  const { user } = useAuth();
  const { entries, recordMany, recordCost } = useGenerationHistory();
  const { save: saveReply } = useSocialReplies();

  const [platform, setPlatform] = useState<Platform>('instagram');
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<Tone>('friendly');
  const [intent, setIntent] = useState<SocialIntent>('question');
  const [gen, setGen] = useState<Generated | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedIdx, setSavedIdx] = useState<number | null>(null);
  const [error, setError] = useState('');

  const recent = useMemo(() => buildRecent(entries), [entries]);

  async function generate() {
    if (!brand) return setError('Brand settings not loaded yet.');
    setBusy(true);
    setError('');
    setSavedIdx(null);
    try {
      const out = await providerFor(brand, businessId).generateSocialReply({ platform, message, tone, intent }, brand, recent);
      setGen(out);
      if (user) {
        await recordMany(user.uid, out.records);
        await recordCost(user.uid, 'social', out.cost);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  async function save(idx: number, reply: string) {
    await saveReply({ platform, message, intent, reply });
    setSavedIdx(idx);
  }

  return (
    <>
      {!embedded && <PageHeader title="Social Reply" subtitle="Reply to comments & DMs" />}

      <div className="card stack">
        <TextArea label="Comment or DM" value={message} onChange={setMessage} placeholder="Paste the comment or message" />
        <div className="grid grid-3">
          <SelectField label="Platform" value={platform} onChange={setPlatform} options={PLATFORMS} />
          <SelectField label="Tone" value={tone} onChange={setTone} options={TONES} />
          <SelectField label="Intent" value={intent} onChange={setIntent} options={INTENTS} />
        </div>
        <button className="btn btn-primary btn-block" onClick={() => void generate()} disabled={busy}>
          {busy ? 'Replying…' : gen ? 'Regenerate' : 'Generate replies'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {gen && (
        <div className="card stack" style={{ marginTop: 16 }}>
          <div className="row between">
            <h2 style={{ margin: 0 }}>Reply options</h2>
            {gen.records[0] && <ScoreBadges scores={recordScores(gen.records[0])} />}
          </div>
          {gen.result.replies.map((reply, i) => (
            <div key={i} className="stack">
              <OutputBlock label={`Reply option ${i + 1}`} text={reply} />
              <RoleGate action="content.create">
                <div className="row">
                  <button className="btn btn-sm" onClick={() => void save(i, reply)}>Save this reply</button>
                  {savedIdx === i && <span className="muted">Saved ✓</span>}
                </div>
              </RoleGate>
            </div>
          ))}
          <div className="muted" style={{ fontSize: '0.8rem' }}>
            Provider: {gen.cost.provider} · ~{gen.cost.tokens} tokens · {gen.cost.generationTimeMs}ms · est ${gen.cost.estimatedCostUsd.toFixed(4)}
          </div>
        </div>
      )}
    </>
  );
}
