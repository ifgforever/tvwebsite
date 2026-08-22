import React, { useEffect, useRef, useState } from 'react';
import { parseDimension, inchesToFraction, inchesToFeet } from '@shared/units';
import { Icon } from './icons';

export function Panel({ title, actions, children, tight, eyebrow }: {
  title?: string; actions?: React.ReactNode; children: React.ReactNode; tight?: boolean; eyebrow?: string;
}) {
  return (
    <section className="panel">
      {title && (
        <header className="panel-head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h3>{title}</h3>
          </div>
          {actions && <div className="spacer" />}
          {actions}
        </header>
      )}
      <div className={`panel-body${tight ? ' tight' : ''}`}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, note, tone }: { label: string; value: React.ReactNode; note?: string; tone?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value${String(value).length > 9 ? ' sm' : ''} ${tone || ''}`}>{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <div className="stat-note" style={{ marginTop: 4 }}>{hint}</div>}
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder, type = 'text', hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

/**
 * Dimension input. Accepts 96, 8', 8'2", 92-5/8 — anything a tape measure says —
 * and shows the parsed value back so there is never a doubt what it took.
 */
export function DimField({ label, value, onChange, min = 0, max = 100000, hint, feet, disabled }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; hint?: string; feet?: boolean; disabled?: boolean;
}) {
  const [text, setText] = useState(() => inchesToFraction(value).replace('"', ''));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(inchesToFraction(value).replace('"', '')); }, [value, focused]);

  const commit = (raw: string) => {
    const parsed = parseDimension(raw, value);
    const clamped = Math.min(max, Math.max(min, parsed));
    onChange(clamped);
    setText(inchesToFraction(clamped).replace('"', ''));
  };

  return (
    <Field label={label} hint={hint || (feet ? inchesToFeet(value) : undefined)}>
      <input
        className="mono" inputMode="decimal" value={text} disabled={disabled}
        onFocus={(e) => { setFocused(true); e.target.select(); }}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => { setFocused(false); commit(e.target.value); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
    </Field>
  );
}

export function NumField({ label, value, onChange, step = 1, min, max, suffix, hint }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string; hint?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(String(value)); }, [value, focused]);
  return (
    <Field label={suffix ? `${label} (${suffix})` : label} hint={hint}>
      <input
        className="mono" inputMode="decimal" step={step} value={text}
        onFocus={(e) => { setFocused(true); e.target.select(); }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setFocused(false);
          const n = parseFloat(text);
          const v = Number.isFinite(n) ? Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)) : value;
          onChange(v);
          setText(String(v));
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
    </Field>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, gold }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; gold?: boolean;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={o.value === value ? `on${gold ? ' gold' : ''}` : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string>({ label, value, onChange, options, hint }: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export function Check({ label, checked, onChange }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function Pill({ tone, children }: { tone?: string; children: React.ReactNode }) {
  return <span className={`pill ${tone || ''}`}>{children}</span>;
}

export function Sheet({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal>
        <div className="panel-head">
          <h3>{title}</h3>
          <div className="spacer" />
          <button className="btn icon sm ghost" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        </div>
        <div className="panel-body">{children}</div>
        {footer && <div className="panel-body" style={{ borderTop: '1px solid var(--line)' }}>{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="display">{title}</div>
      {children && <p style={{ maxWidth: 420, margin: '0 auto 16px' }}>{children}</p>}
      {action}
    </div>
  );
}

let toastId = 0;
const toastListeners = new Set<(t: { id: number; msg: string; err?: boolean } | null) => void>();
export function toast(msg: string, err = false) {
  const t = { id: ++toastId, msg, err };
  toastListeners.forEach((l) => l(t));
  setTimeout(() => toastListeners.forEach((l) => l(null)), 2600);
}
export function Toaster() {
  const [t, setT] = useState<{ id: number; msg: string; err?: boolean } | null>(null);
  useEffect(() => { toastListeners.add(setT); return () => { toastListeners.delete(setT); }; }, []);
  if (!t) return null;
  return <div className={`toast${t.err ? ' err' : ''}`}>{t.msg}</div>;
}

/** Copy-to-clipboard button that reports what it did. */
export function CopyButton({ text, label = 'Copy', className = 'btn sm ghost' }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <button
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setDone(false), 1800);
        } catch { toast('Clipboard blocked by the browser', true); }
      }}
    >
      <Icon name={done ? 'check' : 'clipboard'} size={14} />{done ? 'Copied' : label}
    </button>
  );
}
