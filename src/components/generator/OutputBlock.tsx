// A single generated text block: label, editable text, copy button.
import CopyButton from '../ui/CopyButton';

export default function OutputBlock({
  label,
  text,
  onChange,
  editable = false,
  category,
}: {
  label: string;
  text: string;
  onChange?: (v: string) => void;
  editable?: boolean;
  category?: string;
}) {
  return (
    <div className="card stack" style={{ background: 'var(--surface-2)' }}>
      <div className="row between">
        <div className="row" style={{ gap: 6 }}>
          <strong>{label}</strong>
          {category && <span className="tag">{category}</span>}
        </div>
        <CopyButton text={text} />
      </div>
      {editable && onChange ? (
        <textarea className="textarea" value={text} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <p style={{ margin: 0 }}>{text}</p>
      )}
    </div>
  );
}
