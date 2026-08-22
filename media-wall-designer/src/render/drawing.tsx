/** Drawing primitives: dimension strings, leaders, tags, hatch, scale bar. */
import { inchesToFeet, inchesToFraction } from '@shared/units';

export type DrawTheme = 'screen' | 'print';

export interface DrawStyle {
  line: string; lineLight: string; text: string; dim: string; accent: string;
  fill: string; fillAlt: string; bg: string; hatch: string;
}

export const styleFor = (theme: DrawTheme): DrawStyle =>
  theme === 'print'
    ? { line: '#14110B', lineLight: '#8A8278', text: '#14110B', dim: '#5C554B', accent: '#A8862B', fill: '#FFFFFF', fillAlt: '#F3EFE6', bg: '#FFFFFF', hatch: '#C9C2B4' }
    : { line: '#B8CBDC', lineLight: '#4E6B85', text: '#E4EDF5', dim: '#8FB0CB', accent: '#E5C97A', fill: 'rgba(76,123,168,0.10)', fillAlt: 'rgba(76,123,168,0.22)', bg: 'transparent', hatch: 'rgba(184,203,220,0.30)' };

export const fmt = (v: number, mode: 'ft' | 'in' = 'in') => (mode === 'ft' ? inchesToFeet(v) : inchesToFraction(v));

/** Horizontal dimension. `y` is already in SVG (y-down) space. */
export function DimH({ x1, x2, y, s, label, size = 3, mode = 'in', above }: {
  x1: number; x2: number; y: number; s: DrawStyle; label?: string; size?: number; mode?: 'ft' | 'in'; above?: boolean;
}) {
  const len = Math.abs(x2 - x1);
  if (len < 0.2) return null;
  const mid = (x1 + x2) / 2;
  const t = label ?? fmt(len, mode);
  const tick = size * 0.55;
  return (
    <g stroke={s.dim} strokeWidth={size * 0.09} fill="none">
      <line x1={x1} y1={y - tick} x2={x1} y2={y + tick} />
      <line x1={x2} y1={y - tick} x2={x2} y2={y + tick} />
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <path d={`M${x1} ${y} l${tick} ${-tick * 0.42} M${x1} ${y} l${tick} ${tick * 0.42}`} />
      <path d={`M${x2} ${y} l${-tick} ${-tick * 0.42} M${x2} ${y} l${-tick} ${tick * 0.42}`} />
      <text x={mid} y={above ? y - size * 0.5 : y + size * 1.35} fill={s.text} stroke="none"
        fontSize={size} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">{t}</text>
    </g>
  );
}

/** Vertical dimension. `y1`/`y2` are in SVG space. */
export function DimV({ y1, y2, x, s, label, size = 3, mode = 'in', left }: {
  y1: number; y2: number; x: number; s: DrawStyle; label?: string; size?: number; mode?: 'ft' | 'in'; left?: boolean;
}) {
  const len = Math.abs(y2 - y1);
  if (len < 0.2) return null;
  const mid = (y1 + y2) / 2;
  const t = label ?? fmt(len, mode);
  const tick = size * 0.55;
  return (
    <g stroke={s.dim} strokeWidth={size * 0.09} fill="none">
      <line x1={x - tick} y1={y1} x2={x + tick} y2={y1} />
      <line x1={x - tick} y1={y2} x2={x + tick} y2={y2} />
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <path d={`M${x} ${y1} l${-tick * 0.42} ${tick} M${x} ${y1} l${tick * 0.42} ${tick}`} />
      <path d={`M${x} ${y2} l${-tick * 0.42} ${-tick} M${x} ${y2} l${tick * 0.42} ${-tick}`} />
      <text x={left ? x - size * 0.7 : x + size * 0.7} y={mid} fill={s.text} stroke="none"
        fontSize={size} textAnchor={left ? 'end' : 'start'} dominantBaseline="middle"
        fontFamily="'JetBrains Mono', monospace"
        transform={`rotate(-90 ${left ? x - size * 0.7 : x + size * 0.7} ${mid})`}>{t}</text>
    </g>
  );
}

/** Extension line from an object edge out to a dimension string. */
export function Ext({ x1, y1, x2, y2, s, size = 3 }: { x1: number; y1: number; x2: number; y2: number; s: DrawStyle; size?: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={s.dim} strokeWidth={size * 0.06} strokeDasharray={`${size * 0.5} ${size * 0.35}`} opacity={0.75} />;
}

/** Leader with a text tag on the end. */
export function Tag({ x, y, tx, ty, text, sub, s, size = 3, anchor = 'start' }: {
  x: number; y: number; tx: number; ty: number; text: string; sub?: string; s: DrawStyle; size?: number; anchor?: 'start' | 'end' | 'middle';
}) {
  return (
    <g>
      <line x1={x} y1={y} x2={tx} y2={ty} stroke={s.lineLight} strokeWidth={size * 0.07} />
      <circle cx={x} cy={y} r={size * 0.16} fill={s.lineLight} />
      <text x={tx + (anchor === 'end' ? -size * 0.3 : size * 0.3)} y={ty - size * 0.12} fill={s.text} fontSize={size}
        textAnchor={anchor} fontFamily="'JetBrains Mono', monospace" fontWeight={600}>{text}</text>
      {sub && (
        <text x={tx + (anchor === 'end' ? -size * 0.3 : size * 0.3)} y={ty + size * 0.95} fill={s.dim} fontSize={size * 0.8}
          textAnchor={anchor} fontFamily="'JetBrains Mono', monospace">{sub}</text>
      )}
    </g>
  );
}

export function CenterLine({ x, y1, y2, s, size = 3 }: { x: number; y1: number; y2: number; s: DrawStyle; size?: number }) {
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={s.accent} strokeWidth={size * 0.07}
        strokeDasharray={`${size * 2} ${size * 0.5} ${size * 0.35} ${size * 0.5}`} opacity={0.85} />
      <text x={x + size * 0.4} y={y1 + size * 1.2} fill={s.accent} fontSize={size * 0.85} fontFamily="'JetBrains Mono', monospace">℄</text>
    </g>
  );
}

export function ScaleBar({ x, y, s, size = 3, unitIn = 12, units = 4, label = '1 ft' }: {
  x: number; y: number; s: DrawStyle; size?: number; unitIn?: number; units?: number; label?: string;
}) {
  return (
    <g>
      {Array.from({ length: units }).map((_, i) => (
        <rect key={i} x={x + i * unitIn} y={y} width={unitIn} height={size * 0.7}
          fill={i % 2 ? s.fill : s.line} stroke={s.line} strokeWidth={size * 0.05} />
      ))}
      <text x={x} y={y + size * 2} fill={s.dim} fontSize={size * 0.8} fontFamily="'JetBrains Mono', monospace">0</text>
      <text x={x + units * unitIn} y={y + size * 2} fill={s.dim} fontSize={size * 0.8} textAnchor="end" fontFamily="'JetBrains Mono', monospace">
        {units} {label}
      </text>
    </g>
  );
}

export function DrawTitle({ x, y, title, sub, s, size = 4 }: { x: number; y: number; title: string; sub?: string; s: DrawStyle; size?: number }) {
  return (
    <g>
      <text x={x} y={y} fill={s.text} fontSize={size * 1.5} fontFamily="'Bebas Neue', sans-serif" letterSpacing={size * 0.05}>{title}</text>
      {sub && <text x={x} y={y + size * 1.3} fill={s.dim} fontSize={size * 0.75} fontFamily="'JetBrains Mono', monospace" letterSpacing={size * 0.04}>{sub}</text>}
      <line x1={x} y1={y + size * 0.45} x2={x + Math.max(title.length * size * 0.52, 24)} y2={y + size * 0.45} stroke={s.accent} strokeWidth={size * 0.12} />
    </g>
  );
}
