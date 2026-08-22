/**
 * Dimensioned front elevation — the drawing the whole job is built from.
 * Every dimension comes straight off the model; nothing here is annotation by hand.
 */
import type { Design, FireplaceComponent, NicheComponent, TvComponent } from '@shared/types';
import { inchesToFeet, inchesToFraction } from '@shared/units';
import { CenterLine, DimH, DimV, DrawTitle, Ext, ScaleBar, Tag, styleFor, type DrawTheme } from './drawing';
import { shade } from './defs';

export function ElevationDrawing({ design, theme = 'screen', showTags = true, className, style }: {
  design: Design; theme?: DrawTheme; showTags?: boolean; className?: string; style?: React.CSSProperties;
}) {
  const s = styleFor(theme);
  const { wall } = design;
  const W = wall.widthIn;
  const H = wall.heightIn;
  const u = Math.max(2.4, W * 0.021); // text size in drawing units
  const sy = (y: number, h = 0) => H - y - h;

  const niches = design.components.filter((c): c is NicheComponent => c.type === 'niche').sort((a, b) => a.x - b.x || b.y - a.y);
  const tv = design.components.find((c): c is TvComponent => c.type === 'tv');
  const fp = design.components.find((c): c is FireplaceComponent => c.type === 'fireplace');
  const sb = design.components.find((c) => c.type === 'soundbar');

  // Chain dimension along the top: niche columns and the centre bay.
  const columns: { x: number; w: number; label: string }[] = [];
  for (const n of niches) {
    const hit = columns.find((c) => Math.abs(c.x - n.x) < 1 && Math.abs(c.w - n.w) < 1);
    if (!hit) columns.push({ x: n.x, w: n.w, label: n.label });
  }
  columns.sort((a, b) => a.x - b.x);

  const chain: { a: number; b: number }[] = [];
  let cursor = 0;
  for (const c of columns) {
    if (c.x - cursor > 0.5) chain.push({ a: cursor, b: c.x });
    chain.push({ a: c.x, b: c.x + c.w });
    cursor = c.x + c.w;
  }
  if (W - cursor > 0.5) chain.push({ a: cursor, b: W });

  const leftHeights: { y: number; label: string }[] = [];
  if (fp) leftHeights.push({ y: fp.y, label: 'FIREPLACE' }, { y: fp.y + fp.h, label: '' });
  if (sb) leftHeights.push({ y: sb.y, label: 'SOUNDBAR' });
  if (tv) leftHeights.push({ y: tv.y, label: 'TV BOTTOM' }, { y: tv.y + tv.h / 2, label: 'TV ℄' }, { y: tv.y + tv.h, label: 'TV TOP' });

  // Pad the sheet to fit whatever the drawing actually needs: one dimension
  // lane per height call-out on the left, and room for the tag column on the right.
  const padL = u * (7 + leftHeights.length * 2.6);
  const padR = u * 26;
  const padT = u * (chain.length > 3 ? 15 : 12);
  const padB = u * 14;

  return (
    <svg viewBox={`${-padL} ${-padT} ${W + padL + padR} ${H + padT + padB}`} className={className} style={style} preserveAspectRatio="xMidYMid meet">
      {theme === 'print' && <rect x={-padL} y={-padT} width={W + padL + padR} height={H + padT + padB} fill="#fff" />}

      <DrawTitle x={-padL + u} y={-padT + u * 3} title="FRONT ELEVATION" sub={`SCALE: NTS · ALL DIMENSIONS IN INCHES · ${inchesToFeet(W)} × ${inchesToFeet(H)}`} s={s} size={u} />

      {/* Ceiling and floor reference */}
      <line x1={-u * 4} y1={sy(wall.ceilingHeightIn)} x2={W + u * 4} y2={sy(wall.ceilingHeightIn)} stroke={s.lineLight} strokeWidth={u * 0.09} strokeDasharray={`${u} ${u * 0.6}`} />
      <text x={W + u * 4.5} y={sy(wall.ceilingHeightIn) + u * 0.4} fill={s.dim} fontSize={u * 0.8} fontFamily="'JetBrains Mono', monospace">CEILING {inchesToFeet(wall.ceilingHeightIn)}</text>
      <line x1={-u * 6} y1={sy(0)} x2={W + u * 6} y2={sy(0)} stroke={s.line} strokeWidth={u * 0.16} />
      <text x={W + u * 4.5} y={sy(0) + u * 1.4} fill={s.dim} fontSize={u * 0.8} fontFamily="'JetBrains Mono', monospace">FIN. FLOOR</text>

      {/* Wall body */}
      <rect x={0} y={0} width={W} height={H} fill={s.fill} stroke={s.line} strokeWidth={u * 0.2} />
      <CenterLine x={W / 2} y1={-u * 3} y2={H + u * 3} s={s} size={u} />

      {/* Baseboard */}
      {wall.baseboardKeep && wall.baseboardHeightIn > 0 && (
        <>
          <line x1={0} y1={sy(wall.baseboardHeightIn)} x2={W} y2={sy(wall.baseboardHeightIn)} stroke={s.lineLight} strokeWidth={u * 0.09} />
          <text x={u} y={sy(wall.baseboardHeightIn) + u * 1.1} fill={s.dim} fontSize={u * 0.72} fontFamily="'JetBrains Mono', monospace">
            BASE {inchesToFraction(wall.baseboardHeightIn)}
          </text>
        </>
      )}

      {/* Openings */}
      {niches.map((n, i) => (
        <g key={n.id}>
          <rect x={n.x} y={sy(n.y + n.h)} width={n.w} height={n.h} fill={s.fillAlt} stroke={s.line} strokeWidth={u * 0.13} />
          <text x={n.x + n.w / 2} y={sy(n.y + n.h) + n.h / 2 - u * 0.2} fill={s.text} fontSize={u * 0.92} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontWeight={600}>N{i + 1}</text>
          <text x={n.x + n.w / 2} y={sy(n.y + n.h) + n.h / 2 + u * 1.05} fill={s.dim} fontSize={u * 0.72} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
            {inchesToFraction(n.w)}×{inchesToFraction(n.h)}
          </text>
          <text x={n.x + n.w / 2} y={sy(n.y + n.h) + n.h / 2 + u * 2} fill={s.dim} fontSize={u * 0.66} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
            D {inchesToFraction(n.depthIn)}
          </text>
        </g>
      ))}

      {fp && (
        <g>
          <rect x={fp.x} y={sy(fp.y + fp.h)} width={fp.w} height={fp.h} fill={s.fillAlt} stroke={s.line} strokeWidth={u * 0.16} />
          <text x={fp.x + fp.w / 2} y={sy(fp.y + fp.h) + fp.h / 2 + u * 0.3} fill={s.text} fontSize={u} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontWeight={600}>
            FIREPLACE {inchesToFraction(fp.w)}×{inchesToFraction(fp.h)}
          </text>
          {!fp.props.specsVerified && (
            <text x={fp.x + fp.w / 2} y={sy(fp.y) - u * 0.6} fill={theme === 'print' ? '#A8471F' : '#F08B54'} fontSize={u * 0.72} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
              ⚠ R.O. PER MANUFACTURER — NOT VERIFIED
            </text>
          )}
        </g>
      )}

      {tv && (
        <g>
          <rect x={tv.x} y={sy(tv.y + tv.h)} width={tv.w} height={tv.h} fill="none" stroke={s.line} strokeWidth={u * 0.16} strokeDasharray={`${u * 1.2} ${u * 0.5}`} />
          <text x={tv.x + tv.w / 2} y={sy(tv.y + tv.h) + tv.h / 2} fill={s.text} fontSize={u * 1.1} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontWeight={600}>{tv.label}</text>
          <text x={tv.x + tv.w / 2} y={sy(tv.y + tv.h) + tv.h / 2 + u * 1.3} fill={s.dim} fontSize={u * 0.75} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
            {inchesToFraction(tv.w)} × {inchesToFraction(tv.h)} PANEL
          </text>
        </g>
      )}

      {sb && (
        <rect x={sb.x} y={sy(sb.y + sb.h)} width={sb.w} height={Math.max(sb.h, u * 0.5)} fill={s.fillAlt} stroke={s.line} strokeWidth={u * 0.1} />
      )}

      {design.components.filter((c) => c.type === 'shelf' || c.type === 'custom').map((c) => (
        <rect key={c.id} x={c.x} y={sy(c.y + c.h)} width={c.w} height={c.h} fill={s.fillAlt} stroke={s.line} strokeWidth={u * 0.1} />
      ))}

      {/* Casework and panelling, drawn with the detail a joiner needs */}
      {design.components.filter((c) => c.type === 'panel').map((c) => {
        const p = c as any;
        const pitch = Math.max(0.25, p.props.slatWidthIn + p.props.slatGapIn);
        const vertical = p.props.orientation === 'vertical';
        const across = vertical ? c.w : c.h;
        const n = p.props.pattern === 'flat' ? 0 : Math.min(200, Math.floor(across / pitch));
        return (
          <g key={c.id}>
            <rect x={c.x} y={sy(c.y + c.h)} width={c.w} height={c.h} fill="none" stroke={s.line} strokeWidth={u * 0.13} />
            {Array.from({ length: n }).map((_, i) => (vertical
              ? <line key={i} x1={c.x + i * pitch} y1={sy(c.y + c.h)} x2={c.x + i * pitch} y2={sy(c.y)} stroke={s.lineLight} strokeWidth={u * 0.04} opacity={0.7} />
              : <line key={i} x1={c.x} y1={sy(c.y + c.h) + i * pitch} x2={c.x + c.w} y2={sy(c.y + c.h) + i * pitch} stroke={s.lineLight} strokeWidth={u * 0.04} opacity={0.7} />))}
            <text x={c.x + c.w / 2} y={sy(c.y) - u * 0.8} fill={s.dim} fontSize={u * 0.7} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
              {n} SLATS @ {inchesToFraction(p.props.slatWidthIn)} + {inchesToFraction(p.props.slatGapIn)} GAP
            </text>
          </g>
        );
      })}
      {design.components.filter((c) => c.type === 'shelf_column').map((c) => {
        const p = c as any;
        const t = p.props.carcassThicknessIn;
        const inner = { x: c.x + t, y: c.y + t, w: c.w - t * 2, h: c.h - t * 2 };
        const gap = p.props.shelfCount > 0 ? inner.h / (p.props.shelfCount + 1) : 0;
        return (
          <g key={c.id}>
            <rect x={c.x} y={sy(c.y + c.h)} width={c.w} height={c.h} fill={s.fillAlt} stroke={s.line} strokeWidth={u * 0.15} />
            <rect x={inner.x} y={sy(inner.y + inner.h)} width={inner.w} height={inner.h} fill="none" stroke={s.line} strokeWidth={u * 0.08} />
            {Array.from({ length: p.props.shelfCount }).map((_, i) => (
              <rect key={i} x={inner.x} y={sy(inner.y + gap * (i + 1) + p.props.shelfThicknessIn)} width={inner.w} height={p.props.shelfThicknessIn} fill={s.line} opacity={0.8} />
            ))}
            <text x={c.x + c.w / 2} y={sy(c.y) + u * 1.4} fill={s.dim} fontSize={u * 0.66} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
              {p.props.shelfCount} SH @ {inchesToFraction(gap)}
            </text>
          </g>
        );
      })}
      {design.components.filter((c) => c.type === 'cabinet').map((c) => {
        const p = c as any;
        const bays = Math.max(1, p.props.bays);
        const bayW = c.w / bays;
        return (
          <g key={c.id}>
            <rect x={c.x} y={sy(c.y + c.h)} width={c.w} height={c.h} fill={s.fillAlt} stroke={s.line} strokeWidth={u * 0.15} />
            {Array.from({ length: bays - 1 }).map((_, i) => (
              <line key={i} x1={c.x + bayW * (i + 1)} y1={sy(c.y + c.h)} x2={c.x + bayW * (i + 1)} y2={sy(c.y)} stroke={s.line} strokeWidth={u * 0.08} />
            ))}
            <text x={c.x + c.w / 2} y={sy(c.y + c.h) + c.h / 2 + u * 0.3} fill={s.text} fontSize={u * 0.78} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
              {bays} BAY {p.props.drawersPerBay > 0 ? `${p.props.bays * p.props.drawersPerBay} DRAWER` : 'DOOR'} — {inchesToFraction(bayW)} EA
            </text>
          </g>
        );
      })}
      {design.components.filter((c) => c.type === 'hearth').map((c) => (
        <g key={c.id}>
          <rect x={c.x} y={sy(c.y + c.h)} width={c.w} height={c.h} fill={s.fillAlt} stroke={s.line} strokeWidth={u * 0.15} />
          <text x={c.x + c.w / 2} y={sy(c.y + c.h) + c.h / 2 + u * 0.3} fill={s.text} fontSize={u * 0.72} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
            HEARTH — PROJECTS {inchesToFraction((c as any).props.projectionIn)}
          </text>
        </g>
      ))}

      {/* ---- dimension strings ---- */}
      {/* Overall width, below */}
      <Ext x1={0} y1={H} x2={0} y2={H + u * 8.4} s={s} size={u} />
      <Ext x1={W} y1={H} x2={W} y2={H + u * 8.4} s={s} size={u} />
      <DimH x1={0} x2={W} y={H + u * 7.4} s={s} size={u} mode="ft" />

      {/* Chain of columns and bays, above */}
      {chain.map((c, i) => {
        const short = (c.b - c.a) < W * 0.12;
        const lane = short && i % 2 === 1 ? u * 6.4 : u * 3.6;
        return (
          <g key={i}>
            <Ext x1={c.a} y1={0} x2={c.a} y2={-lane - u * 0.8} s={s} size={u} />
            <Ext x1={c.b} y1={0} x2={c.b} y2={-lane - u * 0.8} s={s} size={u} />
            <DimH x1={c.a} x2={c.b} y={-lane} s={s} size={u} above />
          </g>
        );
      })}

      {/* Overall height, right */}
      <DimV y1={0} y2={H} x={W + u * 3.4} s={s} size={u} mode="ft" />

      {/* Heights above finished floor, left */}
      {leftHeights.map((h, i) => (
        <g key={i}>
          <Ext x1={0} y1={sy(h.y)} x2={-u * (3.6 + i * 2.6)} y2={sy(h.y)} s={s} size={u} />
          <DimV y1={sy(0)} y2={sy(h.y)} x={-u * (3.2 + i * 2.6)} s={s} size={u} left />
          {h.label && (
            <text x={-u * (3.2 + i * 2.6) - u * 1.1} y={sy(h.y) - u * 0.55} fill={s.dim} fontSize={u * 0.6} textAnchor="end" fontFamily="'JetBrains Mono', monospace">{h.label}</text>
          )}
        </g>
      ))}

      {/* Niche vertical spacing on the first column */}
      {niches.length > 1 && (() => {
        const col = niches.filter((n) => Math.abs(n.x - niches[0].x) < 1).sort((a, b) => a.y - b.y);
        return col.slice(0, -1).map((n, i) => {
          const next = col[i + 1];
          const gap = next.y - (n.y + n.h);
          if (gap < 0.3) return null;
          return <DimV key={n.id} y1={sy(n.y + n.h)} y2={sy(next.y)} x={n.x + n.w / 2} s={s} size={u * 0.85} />;
        });
      })()}

      {showTags && (
        <>
          {/* Tags park in fixed lanes down the right margin so leaders never cross. */}
          {tv && (
            <Tag x={tv.x + tv.w * 0.82} y={sy(tv.y + tv.h) + tv.h * 0.2} tx={W + u * 6} ty={H * 0.22}
              text="A  TELEVISION" sub={`${tv.label} · CTR ${inchesToFeet(tv.y + tv.h / 2)} AFF`} s={s} size={u * 0.82} />
          )}
          {fp && (
            <Tag x={fp.x + fp.w * 0.8} y={sy(fp.y + fp.h) + fp.h * 0.5} tx={W + u * 6} ty={H * 0.55}
              text="B  FIREPLACE" sub={`SILL ${inchesToFeet(fp.y)} AFF · ${inchesToFraction(fp.w)} WIDE`} s={s} size={u * 0.82} />
          )}
          {niches[0] && (
            <Tag x={niches[niches.length - 1].x + niches[niches.length - 1].w / 2} y={sy(niches[niches.length - 1].y) - 1}
              tx={W + u * 6} ty={H * 0.82} text="C  NICHES"
              sub={`${niches.length} @ ${inchesToFraction(niches[0].w)}×${inchesToFraction(niches[0].h)}×${inchesToFraction(niches[0].depthIn)} DP`}
              s={s} size={u * 0.82} />
          )}
        </>
      )}

      <ScaleBar x={0} y={H + u * 10} s={s} size={u} />
      <text x={W} y={H + u * 11.2} fill={s.dim} fontSize={u * 0.75} textAnchor="end" fontFamily="'JetBrains Mono', monospace">
        BUILD-OUT DEPTH {inchesToFraction(wall.featureDepthIn)} · {wall.lumber.toUpperCase()} @ {wall.studSpacing}" O.C. · {wall.drywallThickness === 0.5 ? '1/2"' : '5/8"'} DRYWALL
      </text>
      <rect x={W * 0.66} y={H + u * 9.2} width={0} height={0} fill={shade(s.line, 0)} />
    </svg>
  );
}
