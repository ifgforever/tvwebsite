/**
 * Framing plan — drawn from the generated member list, so the drawing and the
 * cut list can never disagree.
 */
import type { Design } from '@shared/types';
import { generateFraming, framingLegend, MEMBER_LABEL } from '@shared/calc/framing';
import { inchesToFeet, inchesToFraction } from '@shared/units';
import { DimH, DimV, DrawTitle, Ext, ScaleBar, styleFor, type DrawTheme } from './drawing';

const KIND_FILL: Record<string, { light: string; dark: string }> = {
  bottom_plate: { light: '#C8A94A', dark: 'rgba(200,169,74,0.42)' },
  top_plate: { light: '#C8A94A', dark: 'rgba(200,169,74,0.42)' },
  cap_plate: { light: '#C8A94A', dark: 'rgba(200,169,74,0.42)' },
  stud: { light: '#D8CFBC', dark: 'rgba(184,203,220,0.26)' },
  king_stud: { light: '#B9AA88', dark: 'rgba(184,203,220,0.42)' },
  jack_stud: { light: '#C6B896', dark: 'rgba(184,203,220,0.34)' },
  cripple: { light: '#E4DCCA', dark: 'rgba(184,203,220,0.16)' },
  header: { light: '#A8471F', dark: 'rgba(210,112,63,0.5)' },
  sill: { light: '#C57A50', dark: 'rgba(210,112,63,0.34)' },
  blocking: { light: '#9DB0C6', dark: 'rgba(107,126,148,0.4)' },
  tv_blocking: { light: '#6B7E94', dark: 'rgba(107,126,148,0.62)' },
  soundbar_blocking: { light: '#8496AA', dark: 'rgba(107,126,148,0.5)' },
  furring: { light: '#E4DCCA', dark: 'rgba(184,203,220,0.16)' },
};

export function FramingDrawing({ design, theme = 'screen', className, style, showLegend = true }: {
  design: Design; theme?: DrawTheme; className?: string; style?: React.CSSProperties; showLegend?: boolean;
}) {
  const s = styleFor(theme);
  const res = generateFraming(design);
  const { wall } = design;
  const W = wall.widthIn;
  const H = wall.heightIn;
  const u = Math.max(2.4, W * 0.02);
  const padL = u * 9, padR = showLegend ? u * 26 : u * 8, padT = u * 11, padB = u * 12;
  const sy = (y: number, h = 0) => H - y - h;
  const fill = (kind: string) => (KIND_FILL[kind] || KIND_FILL.stud)[theme === 'print' ? 'light' : 'dark'];

  const legend = framingLegend(res);
  const studCenters = res.studLines.map((x) => x + 0.75).sort((a, b) => a - b);

  return (
    <svg viewBox={`${-padL} ${-padT} ${W + padL + padR} ${H + padT + padB}`} className={className} style={style} preserveAspectRatio="xMidYMid meet">
      {theme === 'print' && <rect x={-padL} y={-padT} width={W + padL + padR} height={H + padT + padB} fill="#fff" />}

      <DrawTitle x={-padL + u} y={-padT + u * 3} title="FRAMING PLAN" sub={`${res.stats.lumberLabel} @ ${wall.studSpacing}" O.C. · ${res.stats.framedDepth}" FRAMED DEPTH · ${res.members.length} MEMBERS`} s={s} size={u} />

      {/* Existing wall behind */}
      <rect x={0} y={0} width={W} height={H} fill={theme === 'print' ? '#FAF8F3' : 'rgba(76,123,168,0.06)'} stroke={s.lineLight} strokeWidth={u * 0.08} strokeDasharray={`${u} ${u * 0.7}`} />

      {/* Members */}
      {res.members.map((m) => (
        <g key={m.id}>
          <rect x={m.x} y={sy(m.y + m.h)} width={m.w} height={m.h} fill={fill(m.kind)} stroke={s.line} strokeWidth={u * 0.07} />
          {/* Blocking gets the standard flat-blocking X so it reads at a glance */}
          {(m.kind === 'tv_blocking' || m.kind === 'blocking' || m.kind === 'soundbar_blocking') && m.w > u && (
            <path d={`M${m.x} ${sy(m.y + m.h)} L${m.x + m.w} ${sy(m.y)} M${m.x} ${sy(m.y)} L${m.x + m.w} ${sy(m.y + m.h)}`}
              stroke={s.line} strokeWidth={u * 0.05} opacity={0.55} />
          )}
        </g>
      ))}

      {/* Openings called out */}
      {res.openings.map((o) => (
        <g key={o.id}>
          <rect x={o.x} y={sy(o.y + o.h)} width={o.w} height={o.h} fill="none" stroke={s.accent} strokeWidth={u * 0.11} strokeDasharray={`${u * 0.9} ${u * 0.45}`} />
          <text x={o.x + o.w / 2} y={sy(o.y + o.h) + o.h / 2 - u * 0.1} fill={s.text} fontSize={u * 0.82} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontWeight={600}>
            R.O. {inchesToFraction(o.w)} × {inchesToFraction(o.h)}
          </text>
          <text x={o.x + o.w / 2} y={sy(o.y + o.h) + o.h / 2 + u} fill={s.dim} fontSize={u * 0.66} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
            SILL {inchesToFraction(o.y)} AFF{o.verified ? '' : ' · VERIFY'}
          </text>
        </g>
      ))}

      {/* Stud layout chain, bottom */}
      {studCenters.map((c, i) => {
        if (i === 0) return null;
        const prev = studCenters[i - 1];
        if (c - prev < 2) return null;
        return <DimH key={i} x1={prev} x2={c} y={H + u * 3.4} s={s} size={u * 0.8} />;
      })}
      <text x={-padL + u} y={H + u * 4} fill={s.dim} fontSize={u * 0.72} fontFamily="'JetBrains Mono', monospace">O.C.</text>

      <Ext x1={0} y1={H} x2={0} y2={H + u * 7.6} s={s} size={u} />
      <Ext x1={W} y1={H} x2={W} y2={H + u * 7.6} s={s} size={u} />
      <DimH x1={0} x2={W} y={H + u * 6.6} s={s} size={u} mode="ft" />
      <DimV y1={0} y2={H} x={-u * 4} s={s} size={u} mode="ft" left />

      {/* Plate call-outs */}
      <text x={W / 2} y={sy(H) - u * 0.6} fill={s.text} fontSize={u * 0.78} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
        {wall.doubleTopPlate ? 'DOUBLE TOP PLATE' : 'TOP PLATE'} — FASTEN TO CEILING FRAMING
      </text>
      <text x={W / 2} y={sy(0) + u * 2.1} fill={s.text} fontSize={u * 0.78} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
        BOTTOM PLATE{wall.ptBottomPlate ? ' — PRESSURE TREATED' : ''} — ANCHOR PER PLAN
      </text>

      <ScaleBar x={0} y={H + u * 9} s={s} size={u} />

      {showLegend && (
        <g transform={`translate(${W + u * 3}, ${u * 1})`}>
          <text x={0} y={0} fill={s.text} fontSize={u * 1.15} fontFamily="'Bebas Neue', sans-serif" letterSpacing={u * 0.05}>LEGEND</text>
          {legend.map((g, i) => (
            <g key={g.kind} transform={`translate(0, ${u * (2.4 + i * 2.5)})`}>
              <rect x={0} y={-u * 0.95} width={u * 2.2} height={u * 1.25} fill={fill(g.kind)} stroke={s.line} strokeWidth={u * 0.06} />
              <text x={u * 2.9} y={0} fill={s.text} fontSize={u * 0.82} fontFamily="'JetBrains Mono', monospace">{MEMBER_LABEL[g.kind] || g.kind}</text>
              <text x={u * 2.9} y={u * 1.05} fill={s.dim} fontSize={u * 0.68} fontFamily="'JetBrains Mono', monospace">{g.count} pcs · {g.lf.toFixed(1)} lf</text>
            </g>
          ))}
          <g transform={`translate(0, ${u * (3.4 + legend.length * 2.5)})`}>
            <text x={0} y={0} fill={s.text} fontSize={u * 1.15} fontFamily="'Bebas Neue', sans-serif" letterSpacing={u * 0.05}>NOTES</text>
            {[
              `${res.stats.studCount} full-height studs, ${res.stats.crippleCount} cripples`,
              `Stud length ${inchesToFraction(res.stats.studLength)}`,
              `Total ${res.stats.totalLf} lf · ${res.stats.boardFeet} bd ft`,
              'Niche openings framed as a ladder;',
              'stacked niches share column verticals.',
              'R.O. = finished size + drywall return.',
              'Field-verify all dimensions.',
              'Non-structural build-out. Confirm the',
              'existing wall is not load-bearing.',
            ].map((line, i) => (
              <text key={i} x={0} y={u * (2 + i * 1.35)} fill={s.dim} fontSize={u * 0.72} fontFamily="'JetBrains Mono', monospace">{line}</text>
            ))}
          </g>
        </g>
      )}

      <text x={-padL + u} y={H + padB - u * 1.5} fill={s.dim} fontSize={u * 0.7} fontFamily="'JetBrains Mono', monospace">
        WALL {inchesToFeet(W)} × {inchesToFeet(H)} · FINISHED DEPTH {inchesToFraction(wall.featureDepthIn)}
      </text>
    </svg>
  );
}
