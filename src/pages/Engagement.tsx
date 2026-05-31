// Engagement studio: lead follow-ups, missed-call texts, and review request /
// follow-up templates. Each runs through the gate (uniqueness + guardian).
import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { TextField, SelectField } from '../components/ui/Field';
import OutputBlock from '../components/generator/OutputBlock';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { useGenerationHistory } from '../hooks/useGenerationHistory';
import { useAgentLogs } from '../hooks/useAgentLogs';
import { agents } from '../lib/agents';
import type { AgentContext } from '../lib/agents';
import { runReviewTemplates, type LeadIntent } from '../lib/ai/level3';
import type { RecentByType } from '../types/generation';

const emptyRecent = (): RecentByType => ({ hook: [], caption: [], cta: [], script: [], review: [], reply: [] });
const INTENTS: { value: LeadIntent; label: string }[] = [
  { value: 'nurture', label: 'Nurture' },
  { value: 'quote', label: 'Quote follow-up' },
  { value: 'missed_opportunity', label: 'Missed opportunity' },
];

export default function Engagement() {
  const { brand, businessId } = useBusiness();
  const { user } = useAuth();
  const { recordCost } = useGenerationHistory();
  const { log } = useAgentLogs();

  const [service, setService] = useState('flat tire repair');
  const [city, setCity] = useState('Miami');
  const [intent, setIntent] = useState<LeadIntent>('quote');
  const [lead, setLead] = useState<string[] | null>(null);
  const [missed, setMissed] = useState<{ text: string; followUp: string; callbackReminder: string } | null>(null);
  const [review, setReview] = useState<{ request: string; followUp: string } | null>(null);
  const [busy, setBusy] = useState('');

  const ctx = (): AgentContext => ({ businessId: businessId!, uid: user!.uid, brand: brand!, recent: emptyRecent() });
  const ready = brand && businessId && user;

  async function genLead() {
    if (!ready) return;
    setBusy('lead');
    try {
      const res = await agents.leadFollowUp.run({ req: { intent, service, city } }, ctx());
      setLead(res.output.result.messages);
      await recordCost(user.uid, 'lead', res.output.cost);
      await log({ agent: 'LeadFollowUpAgent', action: 'generated', summary: `Lead follow-ups (${intent})` });
    } finally { setBusy(''); }
  }
  async function genMissed() {
    if (!ready) return;
    setBusy('missed');
    try {
      const res = await agents.missedCall.run({ req: { city, service } }, ctx());
      setMissed(res.output.result);
      await recordCost(user.uid, 'missed_call', res.output.cost);
      await log({ agent: 'MissedCallAgent', action: 'generated', summary: 'Missed-call text' });
    } finally { setBusy(''); }
  }
  async function genReview() {
    if (!ready) return;
    setBusy('review');
    try {
      const out = await runReviewTemplates(brand, businessId, { service, city }, []);
      setReview(out.result);
      await recordCost(user.uid, 'review', out.cost);
      await log({ agent: 'ReviewAgent', action: 'generated', summary: 'Review request templates' });
    } finally { setBusy(''); }
  }

  return (
    <>
      <PageHeader title="Engagement" subtitle="Lead follow-ups, missed calls & review asks" />

      <div className="card stack">
        <div className="grid grid-2">
          <TextField label="Service" value={service} onChange={setService} />
          <TextField label="City" value={city} onChange={setCity} />
        </div>
      </div>

      <div className="card stack" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>Lead follow-up</h2>
        <SelectField label="Intent" value={intent} onChange={setIntent} options={INTENTS} />
        <button className="btn btn-primary" onClick={() => void genLead()} disabled={busy === 'lead'}>{busy === 'lead' ? 'Generating…' : 'Generate 3 messages'}</button>
        {lead?.map((m, i) => <OutputBlock key={i} label={`Option ${i + 1}`} text={m} />)}
      </div>

      <div className="card stack" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>Missed call</h2>
        <button className="btn btn-primary" onClick={() => void genMissed()} disabled={busy === 'missed'}>{busy === 'missed' ? 'Generating…' : 'Generate missed-call text'}</button>
        {missed && (
          <>
            <OutputBlock label="Text-back" text={missed.text} />
            <OutputBlock label="Follow-up" text={missed.followUp} />
            <div className="muted" style={{ fontSize: '0.82rem' }}>Callback reminder: {missed.callbackReminder}</div>
          </>
        )}
      </div>

      <div className="card stack" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>Review templates</h2>
        <button className="btn btn-primary" onClick={() => void genReview()} disabled={busy === 'review'}>{busy === 'review' ? 'Generating…' : 'Generate review request + follow-up'}</button>
        {review && (
          <>
            <OutputBlock label="Review request" text={review.request} />
            <OutputBlock label="Review follow-up" text={review.followUp} />
          </>
        )}
      </div>
    </>
  );
}
